import * as fs from "fs";
import { resolve } from "path";
import { CUserManagerDB } from "../Src/DefaultUserManager.js";
function RemoveDB(dbPath){
    if(fs.existsSync(dbPath)){
        fs.unlinkSync(dbPath);
    }
}
test("Basic Test",async()=>{
    let dbPath="./test.db";
    let userName="User1";
    let passwd="passwd";
    //remove old db
    RemoveDB(dbPath);
    let userManager=new CUserManagerDB(dbPath);
    expect(await userManager.CreateUser(userName,passwd)).toBe(true);
    expect(await userManager.Auth(userName,passwd)).toBe(true);
    userManager=null;
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
    userManager=undefined;
    RemoveDB(dbPath);
});
test("CreateUser Thread Safe Test",async()=>{
    let dbPath="./test4.db";
    RemoveDB(dbPath);
    let userManager=new CUserManagerDB(dbPath);
    let awaitfunc=new Promise((resolve,reject)=>{
        let counter=0;
        for(let i=0;i<1000;++i){
            userManager.CreateUser("userName","xxx")
            .then(()=>++counter)
            .catch(err=>reject(err));
        }
        setInterval(() => {
            if(counter==1000){
                resolve();
            }
        }, 10);
    });
    await awaitfunc;
    RemoveDB(dbPath);
});