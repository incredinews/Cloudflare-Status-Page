import{processCronTrigger as r}from"./functions/cronTrigger.js";import{addEventListener as o}from"@cloudflare/workers-types";o("scheduled",o=>{o.waitUntil(r(o))});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBwcm9jZXNzQ3JvblRyaWdnZXIgfSBmcm9tICcuL2Z1bmN0aW9ucy9jcm9uVHJpZ2dlci5qcydcbmltcG9ydCB7IGFkZEV2ZW50TGlzdGVuZXIgfSBmcm9tICdAY2xvdWRmbGFyZS93b3JrZXJzLXR5cGVzJ1xuXG4vKipcbiAqIFRoZSBERUJVRyBmbGFnIHdpbGwgZG8gdHdvIHRoaW5ncyB0aGF0IGhlbHAgZHVyaW5nIGRldmVsb3BtZW50OlxuICogMS4gd2Ugd2lsbCBza2lwIGNhY2hpbmcgb24gdGhlIGVkZ2UsIHdoaWNoIG1ha2VzIGl0IGVhc2llciB0b1xuICogICAgZGVidWcuXG4gKiAyLiB3ZSB3aWxsIHJldHVybiBhbiBlcnJvciBtZXNzYWdlIG9uIGV4Y2VwdGlvbiBpbiB5b3VyIFJlc3BvbnNlIHJhdGhlclxuICogICAgdGhhbiB0aGUgZGVmYXVsdCA0MDQuaHRtbCBwYWdlLlxuICovXG4vL0B0cy1pZ25vcmVcbmNvbnN0IERFQlVHID0gZmFsc2VcblxuLy8gYWRkRXZlbnRMaXN0ZW5lcignZmV0Y2gnLCAoZXZlbnQpID0+IHtcbi8vICAgdHJ5IHtcbi8vICAgICBldmVudC5yZXNwb25kV2l0aChcbi8vICAgICAgIGhhbmRsZUV2ZW50KGV2ZW50LCByZXF1aXJlLmNvbnRleHQoJy4vcGFnZXMvJywgdHJ1ZSwgL1xcLmpzJC8pLCBERUJVRyksXG4vLyAgICAgKVxuLy8gICB9IGNhdGNoIChlKSB7XG4vLyAgICAgaWYgKERFQlVHKSB7XG4vLyAgICAgICByZXR1cm4gZXZlbnQucmVzcG9uZFdpdGgoXG4vLyAgICAgICAgIG5ldyBSZXNwb25zZShlLm1lc3NhZ2UgfHwgZS50b1N0cmluZygpLCB7XG4vLyAgICAgICAgICAgc3RhdHVzOiA1MDAsXG4vLyAgICAgICAgIH0pLFxuLy8gICAgICAgKVxuLy8gICAgIH1cbi8vICAgICBldmVudC5yZXNwb25kV2l0aChuZXcgUmVzcG9uc2UoJ0ludGVybmFsIEVycm9yJywgeyBzdGF0dXM6IDUwMCB9KSlcbi8vICAgfVxuLy8gfSlcblxuYWRkRXZlbnRMaXN0ZW5lcignc2NoZWR1bGVkJywgKGV2ZW50KSA9PiB7XG4gIGV2ZW50LndhaXRVbnRpbChwcm9jZXNzQ3JvblRyaWdnZXIoZXZlbnQpKVxufSlcbiJdLCJuYW1lcyI6WyJwcm9jZXNzQ3JvblRyaWdnZXIiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJ3YWl0VW50aWwiXSwibWFwcGluZ3MiOiJBQUFBLE9BQVNBLHNCQUFBQSxDQUFrQixLQUFRLDRCQUE0QixBQUMvRCxRQUFTQyxvQkFBQUEsQ0FBZ0IsS0FBUSwyQkFBMkIsQ0E2QjVEQSxFQUFpQixZQUFhLEFBQUNDLElBQzdCQSxFQUFNQyxTQUFTLENBQUNILEVBQW1CRSxHQUNyQyJ9