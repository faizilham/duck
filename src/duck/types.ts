import { Token } from "./token";

export enum Type {
    Number = 1,
    String,
    Bool,
    List,
    Struct
}

export interface DuckType {
    type: Type;
    contains(d : DuckType) : boolean; // return true if this === d or this supertype of d
    toString() : string;
}

export namespace DuckType{
    export type Parameter = [string, DuckType];

    export class DuckNumber implements DuckType {
        public readonly type : Type = Type.Number;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public toString() : string{
            return Type[this.type];
        }
    }

    export const Number = new DuckNumber();

    export class DuckString implements DuckType {
        public readonly type : Type = Type.String;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public toString() : string{
            return Type[this.type];
        }
    }

    export const String = new DuckString();

    export class DuckBool implements DuckType {
        public readonly type : Type = Type.Bool;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public toString() : string{
            return Type[this.type];
        }
    }

    export const Bool = new DuckBool();

    export class List implements DuckType {
        public readonly type : Type = Type.List;

        constructor(public elementType?: DuckType){}

        public contains(d : DuckType) : boolean {
            if (!(d instanceof List)){
                return false;
            }

            // for merging X[] with a null []            
            if (!this.elementType){
                return !d.elementType;
            }

            if (!d.elementType){
                return true;
            }

            return this.elementType.contains(d.elementType);
        }

        public isNullList() : boolean {
            if (!this.elementType) return true;
            if (this.elementType instanceof List) return this.elementType.isNullList();

            return false;
        }

        public toString() : string{
            return this.elementType ? this.elementType.toString() + "[]" : "[]";
        }
    }

    export class Struct implements DuckType {
        public readonly type: Type = Type.Struct;
        public members : { [s: string]: DuckType } = {};
        public memberNames : string[] = [];

        constructor(public name : string, parameters : Parameter[]){
            for (let param of parameters){
                this.members[param[0]] = param[1];
                this.memberNames.push(param[0]);
            }
        }

        public contains(d: DuckType): boolean {
            if (!(d instanceof Struct)) return false;

            // check if all member in this is exist and super/same type in d member
            for (let key of this.memberNames){
                if (!d.members[key] || !this.members[key].contains(d.members[key])){
                    return false;
                }
            }

            return true;
        }

        public toString(): string {
            return this.name;
        }
    }
}