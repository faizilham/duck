export enum Type {
    Number = 1,
    String,
    Bool,
    List,
}

export interface DuckType {
    type: Type;
    contains(d : DuckType) : boolean; // return true if this === d or this supertype of d
    toString() : string;
}

export namespace DuckType{
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

        constructor(public readonly elementType?: DuckType){}

        public contains(d : DuckType) : boolean {
            if (!(d instanceof List)){
                return false;
            }

            if (!this.elementType || !d.elementType){
                return false;
            }

            return this.elementType.contains(d.elementType);
        }

        public toString() : string{
            return this.elementType ? this.elementType.toString() + "[]" : "[]";
        }
    }
}