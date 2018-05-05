import { Token, TokenType } from "./token";
import { Expr } from "./ast/expr";
import { Map } from "./map";

export enum Type {
    Void,
    Number,
    String,
    Bool,
    List,
    Struct,
    Func
}

let BaseMethods = new Map<DuckType.Func>();

export abstract class DuckType {
    public readonly type: Type = Type.Void;
    public abstract contains(d : DuckType) : boolean; // return true if this === d or this supertype of d
    public abstract defaultValue() : Expr;

    private methods = new Map<DuckType.Func>();

    public getMethod(name: string) : DuckType.Func{
        return this.methods.get(name) || BaseMethods.get(name);
    }

    public toString() : string{
        return Type[this.type];
    }
}

export namespace DuckType{
    export type Parameter = [string, DuckType];

    export class DuckVoid extends DuckType {
        public readonly type : Type = Type.Void;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public defaultValue(): Expr {
            return new Expr.Literal(null, this);
        }
    }

    export const Void = new DuckVoid();
    
    export class DuckNumber extends DuckType {
        public readonly type : Type = Type.Number;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public defaultValue(): Expr {
            return new Expr.Literal(0, this);            
        }
    }

    export const Number = new DuckNumber();

    export class DuckString extends DuckType {
        public readonly type : Type = Type.String;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public defaultValue(): Expr {
            return new Expr.Literal("", this);            
        }
    }

    export const String = new DuckString();

    export class DuckBool extends DuckType {
        public readonly type : Type = Type.Bool;

        public contains(d : DuckType) : boolean {
            return this.type == d.type;
        }

        public defaultValue(): Expr {
            return new Expr.Literal(false, this);            
        }
    }

    export const Bool = new DuckBool();

    export class List extends DuckType {
        public readonly type : Type = Type.List;

        constructor(public elementType?: DuckType){
            super();
        }

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

        public defaultValue(): Expr {
            return new Expr.List(new Token(TokenType.LEFT_SQUARE, "[", 0), []);
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

    export class Struct extends DuckType {
        public readonly type: Type = Type.Struct;
        public readonly members = new Map<DuckType>();

        constructor(public readonly name : string, parameters : Parameter[]){
            super();
            for (let param of parameters){
                this.members.set(param[0], param[1]);
            }
        }

        public contains(d: DuckType): boolean {
            if (!(d instanceof Struct)) return false;

            // check if all member in this is exist and super/same type in d member
            for (let key of this.members.keys()){
                if (!d.members.get(key) || !this.members.get(key).contains(d.members.get(key))){
                    return false;
                }
            }

            return true;
        }

        public defaultValue() : Expr{
            return new Expr.Call(
                new Expr.Variable(new Token(TokenType.IDENTIFIER, this.name, 0 )),
                new Token(TokenType.LEFT_PAREN, "(", 0),
                [],
                this
            );
        }

        public toString(): string {
            return this.name;
        }
    }

    export class Func extends DuckType {
        public readonly type: Type = Type.Func;

        constructor(public readonly name : string, public readonly parameters : DuckType[], public readonly returnType : DuckType){
            super();
        }

        public contains(d: DuckType): boolean {
            if (!(d instanceof Func))
                return false;

            if (this.parameters.length !== d.parameters.length)
                return false;

            if (!this.returnType.contains(d.returnType))
                return false;

            for (let i = 0; i < this.parameters.length; i++){
                if (!this.parameters[i].contains(d.parameters[i]))
                    return false;
            }

            return true;
        }

        defaultValue(): Expr {
            return new Expr.Literal(null, this); // TODO: handle this
        }

        toString(): string {
            let parameters = this.parameters.join(", ");

            let returnType = "";

            if (!Void.contains(this.returnType)){
                returnType = " -> " + Type[this.returnType.type];   
            }

            return `(${parameters})${returnType}`;
        }
    }

    (function initBaseMethods(){
        BaseMethods.set("toString", new Func("toString", [], String));
    })();
}