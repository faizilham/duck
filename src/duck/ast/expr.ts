import { Token } from '../token';
import { DuckType } from '../types';

export abstract class Expr {
    public abstract accept<T>(visitor : Expr.Visitor<T>) : T;
}

export namespace Expr {
    export type PairParameter = [Token | null, Expr];
    export class Binary extends Expr {
        constructor(public left: Expr, public operator: Token, public right: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitBinaryExpr(this);
        }
    }

    export class Call extends Expr {
        constructor(public callee: Expr, public token: Token, public parameters: PairParameter[], public type?: DuckType) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitCallExpr(this);
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

    export class GetMember extends Expr {
        constructor(public token: Token, public object: Expr, public member: Token) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitGetMemberExpr(this);
        }
    }

    export class Indexing extends Expr {
        constructor(public token: Token, public collection: Expr, public index: Expr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitIndexingExpr(this);
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

    export class List extends Expr {
        constructor(public token: Token, public elements: Expr[]) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitListExpr(this);
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
        visitCallExpr(expr: Call) : T;
        visitGroupingExpr(expr: Grouping) : T;
        visitGetMemberExpr(expr: GetMember) : T;
        visitIndexingExpr(expr: Indexing) : T;
        visitLiteralExpr(expr: Literal) : T;
        visitListExpr(expr: List) : T;
        visitUnaryExpr(expr: Unary) : T;
        visitVariableExpr(expr: Variable) : T;
    }
}
