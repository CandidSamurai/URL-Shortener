import {readFile} from "fs/promises";
import {createServer} from "http";
import path from "path";

const PORT = 3002;

const serveFile = async(res, filePath, contentType) =>{
    try{
        const data = await readFile(filePath);
        res.writeHead(200,{"Content-Type": contentType});
        res.end(data);
    }catch (error){
        res.writeHead(404,{"Content-type": contentType});
        res.end("404 page not found");
    }
}

const server = createServer(async(req,res) => {
    console.log(req.url);

    if(req.method === "GET"){
        if(req.url === "/"){
            return serveFile(
                res,
                path.join("public", "index.html"), "text/html"
            );
        }
        else if(req.method === "GET"){
            if(req.url === "/style.css"){
                return serveFile(
                res,
                path.join("public", "style.css"), "text/css"
                );
            }
        }
    }
});

server.listen(PORT,() =>{
    console.log(`Server running at http://localhost:${PORT}`);
});