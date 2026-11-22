// @counterstrat/demoparser 0.1.0 (MIT) - glue wasm-bindgen adaptado para <script> classico (expoe window.DPM)
window.DPM=(function(){/* @ts-self-types="./demoparser.d.ts" */

/**
 * Bounded-memory streaming handle over one demo: the file is copied into
 * wasm memory ONCE, preparsed ONCE, and each `nextChunk` call decodes exactly
 * one fullpacket segment and returns its rows — so peak memory stays
 * proportional to one segment instead of the whole demo. Row shape matches
 * `parseTicks` (ticks mode) or `parseGrenades` (grenades mode).
 *
 * Grenades mode note: pass `grenadeClasses` (e.g. `["CInferno"]`) for parity
 * with one-shot `parseGrenades`. Unfiltered output also carries weapon-class
 * rows (CC4/knives/guns map to grenade types in the entity-name table), and
 * per-segment decode tracks those extra entity lifetimes differently from the
 * continuous one-shot, so unfiltered row counts can differ from
 * `parseGrenades` (every actual grenade class matches when filtered).
 *
 * One handle serves exactly one mode; the consumer creates one handle per
 * pass, so one `Parser` + one preparse per handle is sufficient.
 */
class ChunkParser {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ChunkParserFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_chunkparser_free(ptr, 0);
    }
    /**
     * Number of segments (fullpacket offsets) in this demo.
     * @returns {number}
     */
    get chunkCount() {
        const ret = wasm.chunkparser_chunkCount(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Release the demo bytes, parser, and preparse snapshot promptly.
     * Idempotent; `nextChunk` after `free` reports a clear error.
     *
     * Note: wasm-bindgen also generates its own `free()` (which destroys the
     * JS wrapper); ours is emitted last in the class body, so it wins at
     * runtime and the wrapper stays alive for the post-free error path. The
     * struct shell itself is reclaimed by the FinalizationRegistry hook.
     */
    free() {
        wasm.chunkparser_free(this.__wbg_ptr);
    }
    /**
     * `file`: whole demo bytes (copied once, shared by all chunks).
     * `mode`: "ticks" or "grenades". `wanted_ticks`: ticks mode only, the
     * exact wanted tick list (`None`/empty means all ticks); ignored for
     * grenades mode. `opts`: `{ wantedProps, grenadeClasses?,
     * nonProjectileGrenades?, skipNones? }`.
     * @param {Uint8Array | number[]} file
     * @param {string} mode
     * @param {Int32Array | number[] | null | undefined} wanted_ticks
     * @param {any} opts
     */
    constructor(file, mode, wanted_ticks, opts) {
        let ptr0, len0, ptr1, len1, ptr2, len2;
        try {
            ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = isLikeNone(wanted_ticks) ? 0 : passArray32ToWasm0(wanted_ticks, wasm.__wbindgen_malloc);
            len2 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.chunkparser_new(ptr0, len0, ptr1, len1, ptr2, len2, opts);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0];
        ChunkParserFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Decode the next fullpacket segment and return its rows (`undefined`
     * once exhausted). The per-tick gate in `collect_entities` already
     * filters rows to `wanted_ticks`, so no post-trim is needed. Errors
     * after `free` instead of touching released state.
     *
     * Returns `Result<JsValue, JsError>` rather than
     * `Result<Option<JsValue>, JsError>`: this wasm-bindgen version cannot
     * return `Option` inside `Result`. Exhaustion is still `undefined` on
     * the JS side, matching what `Option` would generate.
     * @returns {any}
     */
    nextChunk() {
        const ret = wasm.chunkparser_nextChunk(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
}
if (Symbol.dispose) ChunkParser.prototype[Symbol.dispose] = ChunkParser.prototype.free;

/**
 * @param {Uint8Array | number[]} fileBytes
 * @returns {any}
 */
function listGameEvents(fileBytes) {
    const ptr0 = passArray8ToWasm0(fileBytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.listGameEvents(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Uint8Array | number[]} fileBytes
 * @returns {any}
 */
function listUpdatedFields(fileBytes) {
    const ptr0 = passArray8ToWasm0(fileBytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.listUpdatedFields(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Uint8Array | number[]} file
 * @param {string | null} [event_name]
 * @param {any[] | null} [wanted_player_props]
 * @param {any[] | null} [wanted_other_props]
 * @returns {any}
 */
function parseEvent(file, event_name, wanted_player_props, wanted_other_props) {
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3;
    try {
        ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = isLikeNone(event_name) ? 0 : passStringToWasm0(event_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(wanted_player_props) ? 0 : passArrayJsValueToWasm0(wanted_player_props, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
        ptr3 = isLikeNone(wanted_other_props) ? 0 : passArrayJsValueToWasm0(wanted_other_props, wasm.__wbindgen_malloc);
        len3 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr3) { wasm.__externref_drop_slice(ptr3, len3); wasm.__wbindgen_free(ptr3, len3 * 4, 4); }
        if (ptr2) { wasm.__externref_drop_slice(ptr2, len2); wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.parseEvent(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Uint8Array | number[]} file
 * @param {any[] | null} [event_names]
 * @param {any[] | null} [wanted_player_props]
 * @param {any[] | null} [wanted_other_props]
 * @returns {any}
 */
function parseEvents(file, event_names, wanted_player_props, wanted_other_props) {
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3;
    try {
        ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = isLikeNone(event_names) ? 0 : passArrayJsValueToWasm0(event_names, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(wanted_player_props) ? 0 : passArrayJsValueToWasm0(wanted_player_props, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
        ptr3 = isLikeNone(wanted_other_props) ? 0 : passArrayJsValueToWasm0(wanted_other_props, wasm.__wbindgen_malloc);
        len3 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr3) { wasm.__externref_drop_slice(ptr3, len3); wasm.__wbindgen_free(ptr3, len3 * 4, 4); }
        if (ptr2) { wasm.__externref_drop_slice(ptr2, len2); wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.parseEvents(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * extra: lets you add new fields to grenades. Use list_updated_fields for a full list.
 * grenades: lets you disable non-projectile grenades. This can have a big difference on memory/speed.
 * ticks: restricts the output to these ticks (sample big fields like m_VoxelFrameData instead of every tick).
 * grenade_classes: when grenades is enabled, only emit rows for these non-projectile
 * grenade classes (e.g. inferno flames). Omit to emit every non-projectile class.
 * skip_nones: when true, omit missing props from rows instead of emitting explicit nulls.
 * Grenade rows are heterogeneous (projectiles have no fire props, burns have no
 * coordinates), so with wide extras (e.g. m_firePositions) explicit nulls multiply
 * every row. Defaults to false to preserve legacy null behavior.
 * @param {Uint8Array | number[]} file
 * @param {any[] | null} [extra]
 * @param {boolean | null} [grenades]
 * @param {Int32Array | number[] | null} [ticks]
 * @param {any[] | null} [grenade_classes]
 * @param {boolean | null} [skip_nones]
 * @returns {any}
 */
function parseGrenades(file, extra, grenades, ticks, grenade_classes, skip_nones) {
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3;
    try {
        ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = isLikeNone(extra) ? 0 : passArrayJsValueToWasm0(extra, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(ticks) ? 0 : passArray32ToWasm0(ticks, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
        ptr3 = isLikeNone(grenade_classes) ? 0 : passArrayJsValueToWasm0(grenade_classes, wasm.__wbindgen_malloc);
        len3 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr3) { wasm.__externref_drop_slice(ptr3, len3); wasm.__wbindgen_free(ptr3, len3 * 4, 4); }
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.parseGrenades(ptr0, len0, ptr1, len1, isLikeNone(grenades) ? 0xFFFFFF : grenades ? 1 : 0, ptr2, len2, ptr3, len3, isLikeNone(skip_nones) ? 0xFFFFFF : skip_nones ? 1 : 0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Uint8Array | number[]} file
 * @returns {any}
 */
function parseHeader(file) {
    const ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parseHeader(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Bounded-memory slice of `parseTicks` for browsers: only the fullpacket
 * segments overlapping `[tick_lo, tick_hi]` are decoded and only rows in
 * range are returned, so peak memory stays proportional to the slice —
 * never the whole demo. Same row shape as `parseTicks`.
 * @param {Uint8Array | number[]} file
 * @param {any[] | null | undefined} wanted_props
 * @param {number} tick_lo
 * @param {number} tick_hi
 * @param {any[] | null} [wanted_players]
 * @param {boolean | null} [struct_of_arrays]
 * @returns {any}
 */
function parseTickRange(file, wanted_props, tick_lo, tick_hi, wanted_players, struct_of_arrays) {
    const val4 = +tick_lo;
    const val5 = +tick_hi;
    let ptr0, len0, ptr1, len1, ptr2, len2;
    try {
        ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = isLikeNone(wanted_props) ? 0 : passArrayJsValueToWasm0(wanted_props, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(wanted_players) ? 0 : passArrayJsValueToWasm0(wanted_players, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr2) { wasm.__externref_drop_slice(ptr2, len2); wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.parseTickRange(ptr0, len0, ptr1, len1, val4, val5, ptr2, len2, isLikeNone(struct_of_arrays) ? 0xFFFFFF : struct_of_arrays ? 1 : 0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {Uint8Array | number[]} file
 * @param {any[] | null} [wanted_props]
 * @param {Int32Array | number[] | null} [wanted_ticks]
 * @param {any[] | null} [wanted_players]
 * @param {boolean | null} [struct_of_arrays]
 * @returns {any}
 */
function parseTicks(file, wanted_props, wanted_ticks, wanted_players, struct_of_arrays) {
    let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3;
    try {
        ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = isLikeNone(wanted_props) ? 0 : passArrayJsValueToWasm0(wanted_props, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(wanted_ticks) ? 0 : passArray32ToWasm0(wanted_ticks, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
        ptr3 = isLikeNone(wanted_players) ? 0 : passArrayJsValueToWasm0(wanted_players, wasm.__wbindgen_malloc);
        len3 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr3) { wasm.__externref_drop_slice(ptr3, len3); wasm.__wbindgen_free(ptr3, len3 * 4, 4); }
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.parseTicks(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, isLikeNone(struct_of_arrays) ? 0xFFFFFF : struct_of_arrays ? 1 : 0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Weapons lying on the ground (no owner): dropped on death, thrown with the drop key or
 * never picked up. One row per weapon per tick; steamid/name refer to the player who dropped it.
 * extra: fields of the weapon entity (e.g. m_nDropTick). ticks: restrict the output to these ticks.
 * @param {Uint8Array | number[]} file
 * @param {any[] | null} [extra]
 * @param {Int32Array | number[] | null} [ticks]
 * @returns {any}
 */
function parseWeapons(file, extra, ticks) {
    let ptr0, len0, ptr1, len1, ptr2, len2;
    try {
        ptr0 = passArray8ToWasm0(file, wasm.__wbindgen_malloc);
        len0 = WASM_VECTOR_LEN;
        ptr1 = isLikeNone(extra) ? 0 : passArrayJsValueToWasm0(extra, wasm.__wbindgen_malloc);
        len1 = WASM_VECTOR_LEN;
        ptr2 = isLikeNone(ticks) ? 0 : passArray32ToWasm0(ticks, wasm.__wbindgen_malloc);
        len2 = WASM_VECTOR_LEN;
    } catch (e) {
        if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 4, 4); }
        if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
        if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
        throw e;
    }
    const ret = wasm.parseWeapons(ptr0, len0, ptr1, len1, ptr2, len2);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_208446807d0d1e30: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_String_b51de6b05a10845b: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_boolean_get_4f1baf9a00be3c74: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_f249a2a76caa9a55: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_3f58a9d3b3a7eed2: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_function_741ff2bb612836f5: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_8b968c3ab8e96595: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_fc456fee5d3317de: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_be5b34249ff1fc15: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_b2f214e2e4b30e36: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_934b640d0889af78: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_7ce8eee7fd327545: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_40b008ba32f73991: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_done_57e08d0be6e30c02: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_getRandomValues_5d8c030b527203a6: function() { return handleError(function (arg0, arg1) {
            globalThis.crypto.getRandomValues(getArrayU8FromWasm0(arg0, arg1));
        }, arguments); },
        __wbg_get_635eea311fa1a291: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_unchecked_e6325ad374eff861: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_with_ref_key_ce275a9cfaf1b93d: function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_12cdaa4161423e6b: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_d7aeb0dcb3108fea: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_bcf1376d0d732d08: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_iterator_e4c5e8f68ada7b58: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_length_186163212ffe79c3: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_b03a0fabb109b1e9: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_13de428334042d26: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_37eb45aaf5eeb820: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_7075786089b89c5e: function() {
            const ret = new Map();
            return ret;
        },
        __wbg_new_cd4348290afae586: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_next_178c1651c11432b3: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_next_af5ac6a08bb0a717: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_prototypesetcall_13162965d1fe7aa3: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_set_8282f7e0d2d01336: function(arg0, arg1, arg2) {
            const ret = arg0.set(arg1, arg2);
            return ret;
        },
        __wbg_set_8c2c6cf77abfa75b: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_d2d33b52458e984a: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_value_e0f328965e184931: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./demoparser_bg.js": import0,
    };
}

const ChunkParserFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_chunkparser_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function debugString(val) {
    switch (typeof val) {
        // primitive types
        case 'number':
        case 'boolean':
        case 'undefined':
        return `${val}`;
        case 'string':
        return JSON.stringify(val);
        case 'bigint':
        return `${val}n`;
        case 'symbol':
        return val.description !== undefined
            ? `Symbol(${val.description})`
            : 'Symbol';
        case 'function':
        return typeof val.name === 'string' && val.name !== ''
            ? `Function(${val.name})`
            : 'Function';
        case 'object': {
            if (val === null) {
                return 'null';
            }
            // objects
            if (Array.isArray(val)) {
                return '[' + Array.from(val, debugString).join(', ') + ']';
            }
            // errors
            if (val instanceof Error) {
                return `${val.name}: ${val.message}\n${val.stack}`;
            }

            const toStringOutput = toString.call(val);
            // Test for built-in
            const className = /\[object ([^\]]+)\]/.exec(toStringOutput)?.[1];

            // Failed to match the standard '[object ClassName]'
            if (className === undefined) {
                return toStringOutput;
            }
            if (className === 'Object') {
                // we're a user defined class or Object
                // JSON.stringify avoids problems with cycles, and is generally much
                // easier than looping through ownProperties of `val`.
                try {
                    return 'Object(' + JSON.stringify(val) + ')';
                } catch (_) {
                    return 'Object';
                }
            }
            // TODO we could test for more things here, like `Set`s and `Map`s.
            return className;
        }
        // Per MDN: 'This list of values is exhaustive.'
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('demoparser_bg.wasm', location.href);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}



return{initSync,parseHeader,parseEvent,parseEvents,parseTicks}})();
