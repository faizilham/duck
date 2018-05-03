import { Token } from '../token';
import { DuckType } from '../types';

export abstract class TypeExpr {
    public abstract accept<T>(visitor : TypeExpr.Visitor<T>) : T;
}

export namespace TypeExpr {
    export class Basic extends TypeExpr {
        constructor(public typeExpr: Token, public type: DuckType) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitBasicTypeExpr(this);
        }
    }

    export class List extends TypeExpr {
        constructor(public typeExpr: Token, public element: TypeExpr) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitListTypeExpr(this);
        }
    }

    export class Custom extends TypeExpr {
        constructor(public name: Token) {
            super();
        }

        public accept<T>(visitor : Visitor<T>) : T {
            return visitor.visitCustomTypeExpr(this);
        }
    }

    export interface Visitor<T> {
        visitBasicTypeExpr(typeexpr: Basic) : T;
        visitListTypeExpr(typeexpr: List) : T;
        visitCustomTypeExpr(typeexpr: Custom) : T;
    }
}
