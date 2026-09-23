# int_overflow_chain — the int_arith statement, made to overflow

Not a timing case. `int_arith` masks `$h` to 30 bits, so `$h * 31 + $i` never
leaves the int range and its output cannot show what an engine does when the
overflow check fires. Here the first product overflows: `$h` starts at 2^62.

PHP widens the product to float and the `&` converts the out-of-range float back
to int, which PHP 8.4 answers with 0 and a `Deprecated` notice on standard
output. An engine that keeps PHP's arithmetic prints the same three numbers.
elephc 0.27.0 compiles this statement to its fused
`ichecked_numeric_chain_to_int`, the path that made `int_arith` fast.

The runner treats the engines' disagreement as the result, not as a fault.
