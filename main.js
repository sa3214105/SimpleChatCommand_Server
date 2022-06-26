import { SimpleChatService} from "./Src/CSimpleChatService.js";
import { CUserManagerDB } from "./Src/DefaultUserManager.js";
main2();
async function main2(){
    let userManager=new CUserManagerDB("./test2.db");
    let server = new SimpleChatService(userManager);
    server.Start();
    console.log(server.GetCommandList());
}