import * as UV from "./Src/UserValidator.js";
import * as SCC from "./Src/SimpleChatCommand_Server.js";
import * as my_ws from "./Src/MessageManagerWebSocket.js";
//main2();
websocketTest();
async function websocketTest(){
    let messageManager=new my_ws.MessageManagerWebSocket(8080);
    let userValidator=new UV.UserValidator_SQLite("testX.db");
    let sccObj=new SCC.SimpleChatCommand_Server(userValidator,messageManager);
    messageManager.Start();
}