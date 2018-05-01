import { Token } from '../token';
import { DuckType } from '../types';

export abstract class Expr {
    public type : DuckType = null;
}

export namespace Expr {
    export class Binary extends Expr {
        constructor(public left: Expr, public operator: Token, public right: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitBinaryExpr(this);
        }
    }

    export class Grouping extends Expr {
        constructor(public expr: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitGroupingExpr(this);
        }
    }

    export class Literal extends Expr {
        constructor(public value: any, public type: DuckType) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitLiteralExpr(this);
        }
    }

    export class Unary extends Expr {
        constructor(public operator: Token, public expr: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitUnaryExpr(this);
        }
    }

    export class Variable extends Expr {
        constructor(public name: Token) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitVariableExpr(this);
        }
    }

    export abstract class Visitor<T> {
        abstract visitBinaryExpr(expr: Binary) : T;
        abstract visitGroupingExpr(expr: Grouping) : T;
        abstract visitLiteralExpr(expr: Literal) : T;
        abstract visitUnaryExpr(expr: Unary) : T;
        abstract visitVariableExpr(expr: Variable) : T;
    }
}
