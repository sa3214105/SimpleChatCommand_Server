import * as fs from "fs";
import { CUserManagerDB } from "../Src/DefaultUserManager.js";

test("Basic Test",async()=>{
    let dbPath="./test.db";
    let userName="User1";
    let passwd="passwd";
    //remove old db
    fs.rmSync(dbPath,{force:true});
    let userManager=new CUserManagerDB(dbPath);
    await userManager.CreateUser(userName,passwd);
    expect(await userManager.Auth(userName,passwd)).toBe(true)
    fs.rmSync(dbPath,{force:true});
});