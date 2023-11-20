import { MessageManagerWebSocket } from "../Src/MessageManager"
import WebSocket from "ws"
import { Client, MessagePackageStruct, Request } from "../Src/SimpleChatCommandServer";
test("CreateObj", async () => {
    let messageManager = new MessageManagerWebSocket(8080);
    messageManager.stop();
});
test("Basic", async () => {
    let messageManager = new MessageManagerWebSocket(8081);
    let wsClient = new WebSocket('ws://localhost:8081/');
    const messageObject = { test: "test" };
    let serverMessageObjList: Request[] = []
    let clientMessageList: object[] = []
    let workDone: (() => void) | null = null;
    let waitForAllWork = new Promise<void>((resolve, reject) => {
        workDone = resolve;
    })
    messageManager.onMessage((client, command) => {
        serverMessageObjList.push(command);
        messageManager.sendMessage(client, new MessagePackageStruct("1","2","3"));
        return Promise.resolve({
            Command: "",
            State: "",
            Data: null
        });
    })
    wsClient.on("message", (data, isBinary) => {
        if (!isBinary) {
            clientMessageList.push(JSON.parse(data.toString()));
            if (workDone) {
                workDone();
            }
        }
    });
    wsClient.on("open", () => {
        wsClient.send(JSON.stringify({Command:"test",Data:{}}));
        console.log("x");
    })
    await waitForAllWork;
    messageManager.stop();
    wsClient.close();
    expect(serverMessageObjList[0]).toEqual({Command:"test",Data:{}});
    expect(clientMessageList[0]).toEqual(new MessagePackageStruct("1","2","3"));
})