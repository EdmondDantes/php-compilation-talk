# Hosting, build-time examples and compatibility — 2026-09-27

Documentation and existing-source review for the revised presentation.
No new compiler benchmark or execution of the new elephc example was run.

## Hosting narrative

The shared-hosting advantage is ease of source deployment into a provider's
managed PHP environment. Restrictions on compilers, shell access and private
processes are hosting-policy constraints, not an inherent inability to run C++
on a multi-tenant system. PHP itself is not an isolation boundary.

Do not call PHP the only way to serve multiple tenants. Apache supports CGI
programs and separate user permissions with suEXEC. cPanel lets providers
select normal, jailed or disabled shell access. These establish configurable
restrictions, not a universal historical ban.

- [Apache CGI and suEXEC](https://httpd.apache.org/docs/2.4/howto/cgi.html)
- [cPanel shell access choices](https://support.cpanel.net/hc/en-us/articles/4406621405591-How-do-I-change-an-account-s-shell)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)

The presentation's shift from shared hosting to controllable VM/container
images is a narrative synthesis. Both models still coexist. Packaging alone
does not establish an AOT speedup.

## Three examples of moving work ahead of requests

- [Symfony DI compilation and dumping](https://symfony.com/doc/current/components/dependency_injection/compilation.html): resolve service definitions into PHP construction code.
- [Symfony routing compiled matcher dumper](https://github.com/symfony/routing/blob/7.4/Matcher/Dumper/CompiledUrlMatcherDumper.php): prepare route matching structures/code; matching the incoming URL still happens at request time.
- [Twig compilation cache](https://twig.symfony.com/doc/3.x/api.html): compile templates to PHP; rendering with runtime data remains necessary.

The cards show conceptual transformations, not complete generated outputs.
Compilation here can target PHP and does not require native AOT.

## Compatibility overview

The table is a qualitative synthesis of [the compiler inventory](php-compilers.md),
[TypePHP 0.9.3 architecture](typephp-architecture-2026-09.md), and
[the elephc/Manticore source review](compiler-canvas-2026-09.md).
It is not a test-suite pass rate or a promise that an application will compile.
TypePHP's row describes the Zend-backed extension mode, not Nano.

## Language extension examples

TypePHP's `std::vector(Type::Int, 3)` example adapts the syntax already used
in `bench/cases/array_foreach/body-std.php`. It is a function-body fragment;
standalone TypePHP binaries require an entry point. This is a typed C++
container, not an ordinary PHP array. Existing measurements are unaffected.

The elephc example follows the locally checked 0.27.0 documentation at
`8d19942c2ff7d91ccbef71d08587dfde73e048ce`:

- [Packed classes](https://github.com/illegalstudio/elephc/blob/8d19942c2ff7d91ccbef71d08587dfde73e048ce/docs/beyond-php/packed-classes.md)
- [Buffers](https://github.com/illegalstudio/elephc/blob/8d19942c2ff7d91ccbef71d08587dfde73e048ce/docs/beyond-php/buffers.md)

`packed class Point` has float fields and no methods; `buffer<Point>` stores
records contiguously and retains bounds/handle checks. `buffer_free` is
explicit. These extensions are rejected by `--strict-php`. The slide is a
documentation-backed example, not a new executed result.
