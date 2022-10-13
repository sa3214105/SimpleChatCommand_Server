import { SimpleChatService} from "./Src/CSimpleChatService.js";
import * as UM from "./Src/UserValidator.js";
import * as SCC from "./Src/CSimpleChatCommand.js";
import * as my_ws from "./Src/MessageManagerWebSocket.js";
import {UserValidator_SQLite} from "./Src/UserValidator.js";
//main2();
websocketTest();
async function main2(){
    let userManager=new UserValidator_SQLite("./test2.db");
    let server = new SimpleChatService(userManager);
    server.Start();
    console.log(server.GetCommandList());
}
async function websocketTest(){
    let userManager=new UM.CUserManagerDB("./testX.db");
    for(let i=1;i<=10;++i){
        userManager.CreateUser("test"+i,"p@ssw0rd");
    }
    let messageManager=new my_ws.MessageManagerWebSocket(8080);
    let scc=new SCC.SimpleChatCommand(userManager,messageManager);
    messageManager.Start();
}