import {readFile, writeFile } from "fs/promises";
import {createServer} from "http";
import crypto from "crypto";
import path from "path";
import { json } from "stream/consumers";

const PORT = process.env.PORT || 3002;
const DATA_FILE = path.join("data", "links.json");

const serveFile = async(res, filePath, contentType) =>{
    try{
        const data = await readFile(filePath);
        res.writeHead(200,{"Content-Type": contentType});
        res.end(data);
    }catch (error){
        res.writeHead(404,{"Content-type": contentType});
        res.end("404 page not found");
    }
};

const loadLinks = async() =>{
    try {
        const data = await readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(data);

        for (const key in parsed) {
            if (typeof parsed[key] === 'string') {
                parsed[key] = {
                    url: parsed[key],
                    count: 0
                };
            }
        }
        return parsed;
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
};

const saveLinks = async(links) => {
    await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async(req,res) => {
    console.log(req.url);

    if(req.method === "GET"){
        if(req.url === "/"){
            return serveFile(res, path.join("public", "index.html"), "text/html");
        }
        else if (req.url === "/style.css"){
            return serveFile(res, path.join("public", "style.css"), "text/css");
        }else if(req.url === "/links"){
            const links = await loadLinks();
            res.writeHead(200, {"Content-Type":"application/json"});
            return res.end(JSON.stringify(links));
        }
        //
        else if (req.url.startsWith("/count/")) {
                const shortCode = req.url.split("/count/")[1];
                const links = await loadLinks();

                if (links[shortCode]) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ count: links[shortCode].count || 0 }));
                } else {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    return res.end(JSON.stringify({ error: "Short code not found" }));
                }
        }
        //
        else{
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            console.log("links red. ", req.url);
            
            if(links[shortCode]){
                links[shortCode].count = (links[shortCode].count || 0) + 1;
                await saveLinks(links);
                res.writeHead(302, { location: links[shortCode].url });
                return res.end();
            }

            res.writeHead(404, {"Content-Type":"text/plain"});
            return res.end("Shortened URL is not found");
        }
    }

    if(req.method === "POST" && req.url === "/shorten"){
        const links = await loadLinks();

        let body = "";
        req.on("data", (chunk) => (body += chunk));

        req.on('end', async () =>{
            console.log(body);
            const {url, shortCode} = JSON.parse(body);

            if(!url){
                res.writeHead(400, {"Content-Type":"text/plain"});
                return res.end("URL is required");
            }

            const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");

            if(links[finalShortCode]){
                res.writeHead(400, {"Content-Type":"text/plain"});
                return res.end("Short code already exists. Please choose another.");
            }

            links[finalShortCode] = {
                url: url,
                count: 0
            };
            await saveLinks(links);
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify({success:true, shortCode: finalShortCode}));
        });
    }
    if (req.method === "DELETE" && req.url.startsWith("/delete/")) {
        const shortCode = req.url.split("/delete/")[1];
        const links = await loadLinks();

        if (links[shortCode]) {
            delete links[shortCode];
            await saveLinks(links);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Short code not found" }));
        }
    }
});

server.listen(PORT,() =>{
    console.log(`Server running at http://localhost:${PORT}`);
});