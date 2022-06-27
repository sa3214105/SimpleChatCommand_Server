import { SimpleChatService} from "../Src/CSimpleChatService.js";
import { CUserManagerDB } from "../Src/DefaultUserManager.js";

test("Start and Close",async()=>{
    let userManager=new CUserManagerDB("./test2.db");
    let server = new SimpleChatService(userManager);
    await server.Start();
    await server.Close();
});