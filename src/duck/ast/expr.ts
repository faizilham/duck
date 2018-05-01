import { Token } from '../token';
import { DuckType } from '../types';

export abstract class Expr {
    public type? : DuckType;
    public abstract accept<T>(visitor : Expr.Visitor<T>) : T;
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
        constructor(public inner: Expr) {
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
        constructor(public operator: Token, public right: Expr) {
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

    export interface Visitor<T> {
        visitBinaryExpr(expr: Binary) : T;
        visitGroupingExpr(expr: Grouping) : T;
        visitLiteralExpr(expr: Literal) : T;
        visitUnaryExpr(expr: Unary) : T;
        visitVariableExpr(expr: Variable) : T;
    }
}
