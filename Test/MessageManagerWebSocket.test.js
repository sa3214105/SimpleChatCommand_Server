import {MessageManagerWebSocket} from "../Src/MessageManagerWebSocket.js"
import WebSocket from "ws"
test("CreateObj",async()=>{
    let messageManager=new MessageManagerWebSocket(8080);
    messageManager.Start();
    messageManager.Stop();
});
test("Basic",async()=>{
    let messageManager=new MessageManagerWebSocket(8080);
    let wsClient=new WebSocket('ws://localhost:8080/');
    let serverMessageObjList=[]
    let clientMessageList=[]
    let workDone=null;
    messageManager.Start();
    let waitForAllWork=new Promise((resolve,reject)=>{
        workDone=resolve;
    })
    messageManager.SetMessageHandler((user,messageObj)=>{
        serverMessageObjList.push(messageObj);
        user.ID="0";
        messageManager.SendMessage(user,user,messageObj);
    })
    wsClient.on("message",(data,isBinary)=>{
        if(!isBinary){
            clientMessageList.push(JSON.parse(data.toString()));
            workDone()
        }
    });
    wsClient.on("open",()=>{
        wsClient.send(`{"Test":"test"}`);
        console.log("x");
    })
    await waitForAllWork;
    messageManager.Stop();
    wsClient.close();
    expect(serverMessageObjList[0]).toEqual({Test:"test"});
    expect(clientMessageList[0]).toEqual({
        Sender:"0",
        Receiver:"0",
        Message:{Test:"test"}
    });
})