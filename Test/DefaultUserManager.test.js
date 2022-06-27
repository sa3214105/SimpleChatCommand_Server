import * as fs from "fs";
import { CUserManagerDB } from "../Src/DefaultUserManager.js";
function RemoveDB(dbPath){
    fs.rmSync(dbPath,{force:true});
}
test("Basic Test",async()=>{
    let dbPath="./test.db";
    let userName="User1";
    let passwd="passwd";
    //remove old db
    RemoveDB(dbPath);
    let userManager=new CUserManagerDB(dbPath);
    expect(await userManager.CreateUser(userName,passwd)).toBe(true);
    expect(await userManager.Auth(userName,passwd)).toBe(true)
    RemoveDB(dbPath);
});
test("Duplicate User Creation",async()=>{
    let dbPath="./test3.db";
    let userName="User1";
    let passwd="passwd";
    //remove old db
    RemoveDB(dbPath);
    let userManager=new CUserManagerDB(dbPath);
    expect(await userManager.CreateUser(userName,passwd)).toBe(true);
    expect(await userManager.CreateUser(userName,passwd)).toBe(false);
    expect(await userManager.Auth(userName,passwd)).toBe(true);
    RemoveDB(dbPath);
});