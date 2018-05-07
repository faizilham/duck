Duck
=====

Experimenting with static type checking and structural subtyping.

1. All variable must by typed or inferred from initialization
    ```
    let x : number = 9       # x is a number, assigned with value 9
    let y = "test"           # y is inferred as string, assigned with value "test"
    let b : bool             # b is a boolean, assigned with default boolean value (false)

    let c                    # ERROR! 

    let l1 = [1,2,3]         # l1 inferred as number[]
    let l2 : number[]        # l2 is initialized with empty array
    let l3 = [1, "test"]     # ERROR! Element #0 and #1 have different type
    let l4 = []              # ERROR! can't infer type from empty array

    
    ```

2. Strict type checking at compile time
    ```
    let x = 1
    let s = "hello "
    if x {                   # ERROR! can't use number as condition
        x = 12
    } else {
        x = x - 1            # x is number here (declared in outside context)
        let x = "world"      # local x declared as string
        s = s + x            # append s with local x, that is "world"  
    }

    x = x - 10               # x is number here

    func f1 (a: number, b: number) : number {
        if a > 0 {
            return a
        } else if b > 0 {
            return b
        }

        # ERROR! f1 not returning value if all cases failed
    }
    ```


3. Structural subtyping
    ```
    struct Point {
        x: number,
        y: number
    }

    struct Point3D {
        x: number,
        y: number,
        z: number
    }

    struct Line {
        p1: Point, p2: Point
    }

    struct Line3D {
        p1: Point3D, p2: Point3D
    }

    let p  : Point               # Initialized as Point() since no null value in duck
    let p1 : Point  = Point3D()  # valid, because all member of Point exists in Point3D
    let l  : Line    = Line3D()  # valid, because p1 & p2 exists and Point is supertype of Point3D
    let q  : Point3D = Point()   # ERROR!
    ```

4. Compiles to Javascript

    This code
    ```
    struct Point {
        x: number,
        y: number
    }

    struct Point3D {
        x: number,
        y: number,
        z: number
    }

    struct Line {
        p1: Point, p2: Point
    }

    struct Line3D {
        p1: Point3D, p2: Point3D
    }

    func project(p1: Point, p2: Point, zAxis: number) : Point3D {
        return Point3D(x = p1.x + p2.x, y = p1.y + p2.y, zAxis)
    }

    let p = Point(12, 7)
    let q = Point3D(0, 12, 15)
    let l : Line  = Line3D(p1 = project(p, q, 10), p2 = q)
    ```

    Compiles to this JS code

    ```
    function Point(x, y){
        this.x = x || 0;
        this.y = y || 0;
    }

    function Point3D(x, y, z){
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    function Line(p1, p2){
        this.p1 = p1 || new Point();
        this.p2 = p2 || new Point();
    }

    function Line3D(p1, p2){
        this.p1 = p1 || new Point3D();
        this.p2 = p2 || new Point3D();
    }

    function project(p1, p2, zAxis){
        return new Point3D(p1.x + p2.x, p1.y + p2.y, zAxis);
    }

    let p = new Point(12, 7);
    let q = new Point3D(0, 12, 15);
    let l = new Line3D(project(p, q, 10), q);
    ```

5. Basic Optimization
    ```
    let b = (1 + 1) + 3 * 6     # calculate literal values
    let c = (((3)))             # remove unnecessary parentheses

    while !true {               # will never be executed, so it will removed
        b = 7
    }

    if b > 0 {                   
        b = 9
    } else if true {           # will stop at this branch
        b = 99999
    } else if b < -10 {
        b = 1
    } else {
        b = -1
    }

    if true {                   # will only take this branch
        let b = "test"          # but preserve the block because of local variable
    } else {
        b = 1
    }
    ```
    compiles to
    ```
    let b = 20;
    let c = 3;
    if (b > 0) {
        b = 9;
    } else {
        b = 99999;
    }
    {
        let b = "test";
    }
    ```

Ideas (not yet implemented, tentative syntax)
------
1. Struct method and functional trait
2. Function type and lambda
    ```
    let ops : (number, number) : number = [
        \x,y -> x + y,
        \x,y -> x - y,
        \x,y -> x * y
    ]

    let results = ops.map(\op -> op(3, 2)) # should be [5, 1, 6]

    ```
3. Enum / union types, with generics & match statement
    ```
    enum Optional(T) = None | Some(T)

    func div2(n : number) : Optional(number){
        if n % 2 == 0 {
            return Some(n / 2)
        }

        return None
    }

    # divide n by 2 until it isn't possible anymore
    func factor2 (n : number) {
        match div2(n) {
            case None    : print(n, "is the result")
            case Some(x) : factor2(x)

            # All enum value case has to be handled in match
        }
    }
    ```