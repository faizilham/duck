import {Token} from "../token"
import {DuckType} from "../types"

export abstract class Expr {}

export namespace Expr {
    export class Binary extends Expr {
        constructor(public left : Expr, public operator : Token, public right : Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitBinaryExpr(this);
        }
    }

    export class Unary extends Expr {
        constructor(public operator : Token, public right : Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitUnaryExpr(this);
        }
    }

    export class Literal extends Expr {
        constructor(public value : any, public type : DuckType){
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitLiteralExpr(this);
        }
    }

    export abstract class Visitor<T> {
        abstract visitBinaryExpr(expr : Binary) : T;
        abstract visitUnaryExpr(expr : Unary) : T;
        abstract visitLiteralExpr(expr : Literal) : T;
    }
}



