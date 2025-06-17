import { createServer } from "node:http";
import next from "next";



const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();


const server =app.listen(3000 , console.log("Server is running"))
const io =require("socket.io")(server,{
    pingTimeout:60000,
    cors{
        origin:"http://localhost:3000"
    },
});
io.on("connection",(socket)=>{
    console.log("its running socket")
})