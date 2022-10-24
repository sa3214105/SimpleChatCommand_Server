# SimpleChatCommand_Sever--簡易聊天指令伺服器
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sa3214105_SimpleChatService&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=sa3214105_SimpleChatService)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=sa3214105_SimpleChatService&metric=bugs)](https://sonarcloud.io/summary/new_code?id=sa3214105_SimpleChatService)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=sa3214105_SimpleChatService&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=sa3214105_SimpleChatService)
![example workflow](https://github.com/sa3214105/SimpleChatCommand_Server/actions/workflows/jest.yml/badge.svg)

這是基於websocket的簡易聊天服務，可供建立一般聊天室或是作為WebRTC的信令伺服器使用
# Api Docs
參閱[文檔](https://sa3214105.github.io/SimpleChatCommand_Server/)
# 如何使用
以下記述了一些常見的使用範例
+ 建立伺服器
``` 
import * as UV from "./Src/UserValidator.js";
import * as SCC from "./Src/SimpleChatCommand_Server.js";
import * as my_ws from "./Src/MessageManagerWebSocket.js";

let messageManager=new my_ws.MessageManagerWebSocket(8080);
let userValidator=new UV.UserValidator_SQLite("testX.db");
let sccObj=new SCC.SimpleChatCommand_Server(userValidator,messageManager);
messageManager.Start();
```
+ 加入新使用者
```
userValidator.CreateUser(<username>,<password>);
```
+ 關閉伺服器
```
messageManager.Stop();

```
+ 加入客製指令
```
sccObj.AddCustomerCommand("Customer1",async(sender,data)=>{
    ...
})
```
# 指令種類
目前提供以下五種指令，可以透過AddCustomerCommand方法自行擴充，
超連結為對應Command_Structure,沒有超連結的表示不帶有資料欄請帶入null
+ [Login](https://sa3214105.github.io/SimpleChatCommand_Server/LoginStruct.html)
+ LogOut
+ [SendMessage](https://sa3214105.github.io/SimpleChatCommand_Server/MessageStruct.html)
+ [Broadcast](https://sa3214105.github.io/SimpleChatCommand_Server/BroadcastStruct.html)
+ GetUsers
# 指令格式
目前與伺服器溝通的管道是通過webSocket傳送Json，其定義對應到以下類別
+ [CommandStruct](https://sa3214105.github.io/SimpleChatCommand_Server/CommandStruct.html)
為最基礎的結構，以下的結構都會包在其中的Data中，範例如下:
```
{
    "Command":<Command_Name>,
    "Data":<Command_Structure>
}
```
