export function InstanceOf_Soft(_class,_obj){
   return IsEqual(Object.assign(new _class(),_obj),_obj);
}
export function IsEqual(obj1,obj2){
    return JSON.stringify(obj1)===JSON.stringify(obj2);
}