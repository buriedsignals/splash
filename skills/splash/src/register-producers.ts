// The ONE registration entry point — imports every engine's manifest for its side effect
// (each calls registerProducer at module top-level). Import this ONCE from the dispatch
// path (adapters.ts) so the registry is fully populated before any getProducer call.
//
// Ordering does not matter (registerProducer is name-keyed, not positional). Module caching
// guarantees the side effects run exactly once no matter how many modules import this file;
// registerProducer throws on a duplicate name, so an accidental second registration is loud.
import "../../chart-native/src/manifest";
import "../../map-native/src/manifest";
import "../../scrolly/src/manifest";
import "../../image-native/src/manifest";
import "../../dw-chart/src/manifest";
import "../../map-dw/src/manifest";
