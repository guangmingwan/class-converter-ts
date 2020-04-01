import { isArray } from 'lodash';
import store from './store';
import sxml = require("sxml");
 
import XML = sxml.XML;
import XMLList = sxml.XMLList;

import { JosnType, OriginalStoreItemType, BasicClass, StoreItemType } from './typing';

const objectToClass = <T>(
  originalKeyStore: Map<string, OriginalStoreItemType[]>,
  xmlObj: XML,//{ [key: string]: any },
  Clazz: BasicClass<T>,
): T => {
  const instance: any = new Clazz();
  console.log("objectToClass =>>>",typeof Clazz.name)
  originalKeyStore.forEach((propertiesOption: OriginalStoreItemType[], originalKey) => {
    if(originalKey ==undefined || originalKey ==null || originalKey.length == 0) {
      throw(new Error("originalKey is empty"));
    }
    var  originalValue = xmlObj.count(originalKey)>0 ?  xmlObj.get(originalKey) : null;
    if(originalValue==null) {
      console.log(propertiesOption)
      console.log("originalKey is empty",originalKey,instance);
    }
    
    propertiesOption.forEach(
      ({ key, deserializer, targetClass, optional, array, dimension }: OriginalStoreItemType) => {
        if (originalValue === undefined) {
          if (!optional) {
            throw new Error(`Cannot map '${originalKey}' to ${Clazz.name}.${key}, property '${originalKey}' not found`);
          }
          return;
        }
        if (originalValue === null) {
          var instanceDefaultvalue = instance[key];
          var newValue = deserializer ? deserializer(originalValue, instance, xmlObj) : (originalValue==null? null :originalValue);
          if (optional && instanceDefaultvalue == undefined && (instance[key] == null|| instance[key] == '' )){
            delete instance[key];
          }
          if(newValue!= undefined && newValue!= '') {
            instance[key] = newValue
          }
          
          return;
        }
        let value = originalValue;
        console.log("set value from originalValue", value);
        if (targetClass) {
          if (array) {
            if (dimension === 1) {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              var tmpValue = <any>(toClasses(originalValue, targetClass));
              console.log("tmpValue1:", tmpValue);
              value = tmpValue;
            } else {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              var tmpValue = <any>(originalValue.data().map((cur: any) => toClasses(cur, targetClass)));
              console.log("tmpValue2:", tmpValue);
              value = tmpValue;
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            var tmpValue = toClass(originalValue.at(0), targetClass);
            console.log("tmpValue3:", tmpValue);
            value = tmpValue;
          }
        }
        //console.log("===>",value);
        if(deserializer) {
          instance[key] = deserializer(value.at(0).getValue(), instance, xmlObj)
        }
        else {
          if(value instanceof XMLList) {
            //console.log("Clazz.prototype[key]:",Clazz.name, key, typeof instance[key])
            if(typeof instance[key] == "number") {
              //console.log("type of ",key, typeof instance[key]);
              instance[key] = +value.at(0).getValue()
            }
            else {
              instance[key] = value.at(0).getValue()
            }
          }
          else {
            //console.log("type of ",key, typeof instance[key]);
            //instance[key] = value;
            instance[key] = value;
            
          }
        }
        //instance[key] = deserializer ? deserializer(value.at(0).getValue(), instance, xmlObj) : (<any>value).getValue();
      },
    );
  });
  return instance;
};

const getOriginalKetStore = <T>(Clazz: BasicClass<T>) => {
  let curLayer = Clazz;
  const originalKeyStore = new Map<string, OriginalStoreItemType[]>();
  while (curLayer.name) {
    const targetStore = store.get(curLayer);
    if (targetStore) {
      targetStore.forEach((storeItem: StoreItemType, key: string) => {
        const item = {
          key,
          ...storeItem,
        };
        if (!originalKeyStore.has(storeItem.originalKey)) {
          originalKeyStore.set(storeItem.originalKey, [item]);
        } else {
          const exists = originalKeyStore.get(storeItem.originalKey);
          if (!exists.find((exist: OriginalStoreItemType) => exist.key === key)) {
            originalKeyStore.set(storeItem.originalKey, [...originalKeyStore.get(storeItem.originalKey), item]);
          }
        }
      });
    }
    curLayer = Object.getPrototypeOf(curLayer);
  }
  return originalKeyStore;
};

export const toClasses = <T>(rawJson: XMLList, Clazz: BasicClass<T>): T[] => {
  // if (!isArray(rawJson)) {
  //   throw new Error(`rawJson ${rawJson} must be a array`);
  // }
 
  return rawJson.data().map((item: XML) => objectToClass<T>(getOriginalKetStore(Clazz), item, Clazz));
};

export const toClass = <T>(rawJson: XML, Clazz: BasicClass<T>): T => {
  return objectToClass<T>(getOriginalKetStore(Clazz), rawJson, Clazz);
};
