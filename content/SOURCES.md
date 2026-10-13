# Sources for supplementary lesson content

The lessons are based on the STI (IT1708) handouts. Material added beyond the handouts is
written in our own words with our own examples. Nothing is copied from the sources below.

- Downey, A. B. and Mayfield, C. *Think Java: How to Think Like a Computer Scientist*, 2nd ed.
  Green Tea Press. CC BY-NC-SA 4.0. https://greenteapress.com/wp/think-java-2e
- Eck, D. J. *Introduction to Programming Using Java*, version 9. CC BY-NC-SA 4.0.
  https://math.hws.edu/javanotes9

## arrays

| Lesson | Added | Informed by |
|---|---|---|
| arrays-1 | Arrays are references (aliasing vs `Arrays.copyOf`) | Think Java ch. 7 and ch. 9 |
| arrays-2 | Counting with an array; passing an array to a method | Think Java ch. 7 (histogram); Eck ch. 7 |
| arrays-3 | Rows of different lengths | Eck ch. 7 |
| arrays-5 | `copyOf` and `copyOfRange` | Think Java ch. 7 |

All code examples were compiled and run on JDK 17 before being added.

## introduction-to-java

| Lesson | Added | Informed by |
|---|---|---|
| introduction-to-java-1 | JDK, JRE and JVM nesting | Think Java ch. 1 |
| introduction-to-java-2 | Escape sequences | Think Java ch. 1 |
| introduction-to-java-3 | Meaningful names, constant and package conventions | Think Java ch. 2 and 3 |
| introduction-to-java-5 | What `args` holds | Think Java ch. 9 |
| introduction-to-java-6 | "Could not find or load main class" error | No primary source; checked by running the code |
| introduction-to-java-7 | Runtime errors (lesson retitled "Kinds of error"); key takeaway updated | Think Java ch. 1 and Appendix D |
| introduction-to-java-8 | Documentation comments | Think Java Appendix B |
| introduction-to-java-9 | `java.lang` is imported automatically | No primary source; checked by running the code |

## data-types

| Lesson | Added | Informed by |
|---|---|---|
| data-types-1 | Why the type matters (`5 + 5` vs `"5" + "5"`) | Think Java ch. 2 |
| data-types-2 | Type limits through `MIN_VALUE` and `MAX_VALUE` | Think Java ch. 9 |
| data-types-3 | `=` is assignment, not equality | Think Java ch. 2 |
| data-types-4 | `Math.PI` | Think Java ch. 4 |
| data-types-5 | Cast precedence; `char` and `int` conversion | Think Java ch. 2 and 3 |

All code examples were compiled and run on JDK 17 before being added.

## operators

| Lesson | Added | Informed by |
|---|---|---|
| operators-1 | Unary, binary and ternary operators | Think Java ch. 2 |
| operators-2 | The `+` operator with text, left-to-right | Think Java ch. 2 |
| operators-4 | De Morgan's laws | Think Java ch. 5 |
| operators-5 | Prefix and postfix increment | Think Java ch. 6 |

## expressions

| Lesson | Added | Informed by |
|---|---|---|
| expressions-1 | Expressions versus statements | Think Java ch. 2 |
| expressions-2 | Expression type decided before storing (`int` overflow) | Think Java ch. 2 and 9 |
| expressions-3 | Characters in arithmetic | Think Java ch. 3 |
| expressions-4 | Testing a range with `&&` | Think Java ch. 5 |

## input-output

| Lesson | Added | Informed by |
|---|---|---|
| input-output-1 | Checking input with `hasNextInt()` | Think Java ch. 3 and 5 |
| input-output-2 | Several values on one line | Think Java ch. 3 |
| input-output-3 | Blank line with `println()` | Think Java ch. 1 |
| input-output-4 | `String.format` and the `,` flag | Think Java ch. 3 and 6 |

## control-structures

| Lesson | Added | Informed by |
|---|---|---|
| control-structures-2 | Boolean variables as conditions | Think Java ch. 5 |
| control-structures-3 | Even or odd with `%` | Think Java ch. 5 |
| control-structures-4 | Scope of variables declared in a block | Think Java ch. 4 and 10 |
| control-structures-5 | Which `if` an `else` belongs to | No primary source; checked by running the code |
| control-structures-7 | Arrow form of `switch` (Java 14+) | No primary source; checked by running the code |

## loops

| Lesson | Added | Informed by |
|---|---|---|
| loops-2 | Accumulator (running total) | Think Java ch. 6 |
| loops-3 | Counting down and stepping | Think Java ch. 6 |
| loops-4 | Input validation with `do...while` | Think Java ch. 5 and 6 |
| loops-5 | Digits of a number with `% 10` and `/ 10` | Think Java ch. 6 and 8 |
| loops-7 | Printing a triangle with nested loops | Think Java ch. 6 |

## strings

| Lesson | Added | Informed by |
|---|---|---|
| strings-1 | Empty string versus `null` | Think Java ch. 9 |
| strings-3 | Putting the literal first in `equals` | No primary source; checked by running the code |
| strings-4 | Chaining methods | Think Java ch. 6 |
| strings-5 | `contains`, `startsWith`, `split`; `parseInt` and `valueOf` | Think Java ch. 6 and 9 |

## predefined-functions

| Lesson | Added | Informed by |
|---|---|---|
| predefined-functions-2 | `Math.random()` and `Math.round` return type | Think Java ch. 4 and 7 |
| predefined-functions-3 | Methods calling methods; overloading | Think Java ch. 4 |
| predefined-functions-4 | Passing arrays to methods | Think Java ch. 7 and 10 |

## recursion

| Lesson | Added | Informed by |
|---|---|---|
| recursion-1 | Recursive power | Think Java ch. 8 |
| recursion-2 | Two base cases (Fibonacci) | Think Java ch. 8 |
| recursion-4 | The leap of faith; recursion on strings (reverse) | Think Java ch. 8 and 9 |
| recursion-5 | Iterative Fibonacci | Think Java ch. 8 |

## oop

| Lesson | Added | Informed by |
|---|---|---|
| oop-2 | Attributes as fields, behaviors as methods | Think Java ch. 10 and 11 |
| oop-3 | Default field values; variables hold references | Think Java ch. 10 |
| oop-4 | Using inherited fields | Think Java ch. 14 |
| oop-5 | Implementing several interfaces | Think Java ch. 17 |

## classes-and-methods

| Lesson | Added | Informed by |
|---|---|---|
| classes-and-methods-1 | `toString()` | Think Java ch. 11 |
| classes-and-methods-2 | Package-private access | No primary source; standard Java rule, not run as code |
| classes-and-methods-5 | Overriding `equals`; `null` references | Think Java ch. 10 and 11 |

## object-and-methods

| Lesson | Added | Informed by |
|---|---|---|
| object-and-methods-1 | A constructor with parameters | Think Java ch. 11 |
| object-and-methods-3 | Which overload is called (widening) | No primary source; checked by running the code |
| object-and-methods-4 | Static constants | Think Java ch. 4 and 12 |
| object-and-methods-5 | `java.util.Random` and seeds | Think Java ch. 7 |

Note: the printed output in object-and-methods-2 was missing the " kg" that the code prints; corrected to match the code (verified by running it).

## inheritance-polymorphism-interfaces

| Lesson | Added | Informed by |
|---|---|---|
| inheritance-polymorphism-interfaces-1 | Every class extends `Object` | Think Java ch. 14 |
| inheritance-polymorphism-interfaces-2 | `final` methods and classes | No primary source; standard Java rule, not run as code |
| inheritance-polymorphism-interfaces-4 | `instanceof` and casting | Think Java ch. 14 and 16 |
| inheritance-polymorphism-interfaces-5 | `Comparable` | Think Java ch. 12 |

## exception-handling

| Lesson | Added | Informed by |
|---|---|---|
| exception-handling-2 | The compiler error for an unreported checked exception | Eck ch. 8 (8.3); checked by compiling |
| exception-handling-3 | Retrying after `InputMismatchException` | Think Java ch. 5; Eck ch. 8 |
| exception-handling-4 | Exceptions travel up the call stack | Eck ch. 8 (8.3) |
| exception-handling-5 | `finally` after `return` | No primary source; checked by running the code |
| exception-handling-6 | Unchecked custom exceptions | Eck ch. 8 (8.3) |

## file-io

| Lesson | Added | Informed by |
|---|---|---|
| file-io-2 | `Files.exists` and `deleteIfExists` | Eck ch. 11 |
| file-io-3 | Commas inside CSV values | No primary source; checked by running the code |
| file-io-5 | `APPEND`; reading a file with `Scanner` | Eck ch. 11 |

## enums-nested-classes

| Lesson | Added | Informed by |
|---|---|---|
| enums-nested-classes-1 | Enums as parameters | Eck ch. 2 (2.3.5) |
| enums-nested-classes-2 | `compareTo` on enum constants | Eck ch. 2 (2.3.5); checked by running the code |
| enums-nested-classes-4 | Arrow form of `switch` on an enum | Eck ch. 3 (3.6.3); checked by running the code |
| enums-nested-classes-6 | Static nested versus inner class objects | Eck ch. 5 (5.8) |

## regular-expressions

| Lesson | Added | Informed by |
|---|---|---|
| regular-expressions-1 | Validating a student-number format | No primary source; checked by running the code |
| regular-expressions-2 | Escaping the dot | No primary source; checked by running the code |
| regular-expressions-3 | Grouping and optional parts | No primary source; checked by running the code |
| regular-expressions-4 | Capturing groups | Wikibooks Java Programming, Regular Expressions (cross-check, CC BY-SA); checked by running the code |
| regular-expressions-5 | Stripping non-digits with `replaceAll` | No primary source; checked by running the code |

## concurrency

| Lesson | Added | Informed by |
|---|---|---|
| concurrency-1 | Thread names, `main` thread | Eck ch. 12 |
| concurrency-2 | Lambda `Runnable`; default thread names | Eck ch. 12; checked by running the code |
| concurrency-4 | `AtomicInteger` | Eck ch. 12 |

## generics

| Lesson | Added | Informed by |
|---|---|---|
| generics-1 | Generic methods | Eck ch. 10 |
| generics-4 | `ArrayList<String>` basics; bounded type parameters | Eck ch. 10 |
