// @golevelup/nestjs-discovery is CommonJS and require()s the ESM-only NestJS 12. jest reports that as
// "require(esm) in a cycle" unless NestJS is fully evaluated first, so load it before any test module.
await import("@nestjs/common");
await import("@nestjs/core");
