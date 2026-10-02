// Apache-2.0. Analyzer predicates adapted from AOSP PageAlignUtils.kt (Copyright
// 2024 The Android Open Source Project), pinned below. See
// https://www.apache.org/licenses/LICENSE-2.0 . This is a static audit, not a
// claim that an APK has been installed or executed on a 16KB-page device.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

const PAGE = 16384n;
const SOURCE_COMMIT = '98d74cacf9e66ccd3df10108a095156383502870';
const SOURCE_URL = `https://android.googlesource.com/platform/tools/base/+/${SOURCE_COMMIT}/sdk-common/src/main/java/com/android/ide/common/pagealign/PageAlignUtils.kt`;
const hex = value => `0x${value.toString(16)}`;
const aligned = value => value % PAGE === 0n;
const down = value => value - value % PAGE;
const up = value => aligned(value) ? value : down(value) + PAGE;
const end = segment => segment.vaddr + segment.memsz;
const byAddress = (a, b) => a.vaddr < b.vaddr ? -1 : a.vaddr > b.vaddr ? 1 : 0;

function containedSections(segment, sections) {
  // Keep all sections, including zero-size and non-allocated section headers.
  // Kotlin SectionHeader equality compares only address and size; sorting is
  // stable and compares only address. Do not use names, flags, or ELF mappings.
  return sections.filter(section => section.vaddr >= segment.vaddr && end(section) <= end(segment)).sort(byAddress);
}

function sameSections(a, b) {
  return a.length === b.length && a.every((section, index) => section.vaddr === b[index].vaddr && section.memsz === b[index].memsz);
}

function analyze(context) {
  const loads = context.headers.filter(header => header.type === 'LOAD').sort(byAddress);
  const relros = context.headers.filter(header => header.type === 'GNU_RELRO');
  const problems = [];
  const minimumAlign = loads.reduce((value, load) => value === null || load.align < value ? load.align : value, null);
  if (minimumAlign !== null && !aligned(minimumAlign)) problems.push('LoadSectionNotAligned');
  const relroDetails = relros.map(relro => {
    let containingIndex = -1;
    for (let index = 0; index < loads.length; index += 1) if (loads[index].vaddr <= relro.vaddr) containingIndex = index;
    const load = loads[containingIndex];
    const nextLoad = loads[containingIndex + 1];
    const relroSections = containedSections(relro, context.sections);
    const loadSections = load ? containedSections(load, context.sections) : [];
    const equalSections = Boolean(load && sameSections(relroSections, loadSections));
    const localProblems = [];
    let acceptedBy;
    if (!load) {
      localProblems.push('RelroStartNotAligned');
    } else if (nextLoad && end(relro) > nextLoad.vaddr) {
      localProblems.push('RelroEndNotAligned');
    } else if (equalSections) {
      acceptedBy = 'equal-contained-sections';
    } else {
      if (!aligned(relro.vaddr) && relro.vaddr !== load.vaddr) localProblems.push('RelroStartNotAligned');
      if (!aligned(end(relro)) && end(relro) !== end(load)) localProblems.push('RelroEndNotAligned');
      if (localProblems.length === 0) acceptedBy = 'prefix-and-suffix-rules';
    }
    problems.push(...localProblems);
    const protectionStart = down(relro.vaddr);
    const protectionEnd = up(end(relro));
    // Independent safety check: subtract every raw RELRO byte interval from
    // each writable LOAD, then look for writable bytes protected by rounding.
    // This additional check is stricter than Google's section-list predicate.
    const overlaps = [];
    for (const writable of loads.filter(item => item.flags.includes('W'))) {
      let ranges = [{ start: writable.vaddr, end: end(writable) }];
      for (const excluded of relros) {
        ranges = ranges.flatMap(range => {
          const lo = range.start > excluded.vaddr ? range.start : excluded.vaddr;
          const hi = range.end < end(excluded) ? range.end : end(excluded);
          if (lo >= hi) return [range];
          return [range.start < lo ? { start: range.start, end: lo } : null, hi < range.end ? { start: hi, end: range.end } : null].filter(Boolean);
        });
      }
      for (const range of ranges) {
        const lo = range.start > protectionStart ? range.start : protectionStart;
        const hi = range.end < protectionEnd ? range.end : protectionEnd;
        if (lo < hi) overlaps.push({ writableLoadStart: hex(writable.vaddr), start: hex(lo), end: hex(hi), bytes: Number(hi - lo) });
      }
    }
    const nextWritable = loads.find(item => item.flags.includes('W') && item.vaddr >= end(relro));
    return {
      start: hex(relro.vaddr), end: hex(end(relro)), rawEndMod16k: Number(end(relro) % PAGE),
      containingLoad: load ? { start: hex(load.vaddr), end: hex(end(load)) } : null,
      nextLoadStart: nextLoad ? hex(nextLoad.vaddr) : null,
      equalContainedSections: equalSections,
      containedRelroSections: relroSections.map(section => ({ name: section.name, address: hex(section.vaddr), size: hex(section.memsz) })),
      containedLoadSections: loadSections.map(section => ({ name: section.name, address: hex(section.vaddr), size: hex(section.memsz) })),
      exactLoadStart: Boolean(load && relro.vaddr === load.vaddr),
      exactLoadEnd: Boolean(load && end(relro) === end(load)),
      protection16k: { start: hex(protectionStart), end: hex(protectionEnd) },
      nextWritableLoad: nextWritable ? { start: hex(nextWritable.vaddr), pageStart16k: hex(down(nextWritable.vaddr)), end: hex(end(nextWritable)) } : null,
      nonRelroWritableByteOverlaps: overlaps, acceptedBy: acceptedBy ?? null, problems: localProblems,
    };
  });
  return {
    analyzerPass: problems.length === 0, problems, minimumLoadAlignment: minimumAlign === null ? null : Number(minimumAlign),
    loadSegments: loads.length, relroSegments: relros.length,
    strictLoadCongruencePass: loads.every(load => load.align >= PAGE && (load.align & (load.align - 1n)) === 0n && load.offset % PAGE === load.vaddr % PAGE),
    roundedRelroWritableOverlapPass: relroDetails.every(item => item.nonRelroWritableByteOverlaps.length === 0),
    relro: relroDetails,
  };
}

function parseLlvm(text, name) {
  assert.match(text, /Class:\s+ELF64\b/, `${name}: expected ELF64`);
  assert.match(text, /Data:\s+2's complement,\s+little endian\b/, `${name}: expected little endian`);
  const sectionCount = Number(text.match(/There are (\d+) section headers/)?.[1]);
  const programCount = Number(text.match(/There are (\d+) program headers/)?.[1]);
  assert.ok(Number.isInteger(sectionCount) && sectionCount > 0, `${name}: section table is absent or unreadable`);
  assert.ok(Number.isInteger(programCount) && programCount > 0, `${name}: program table is absent or unreadable`);
  const sections = [];
  for (const line of text.split('\n')) {
    const row = line.match(/^\s*\[\s*(\d+)\]\s+(.*)$/);
    if (!row) continue;
    const values = row[2].trim().split(/\s+/);
    const addressIndex = values.findIndex(value => /^[0-9a-fA-F]{16}$/.test(value));
    assert.ok(addressIndex === 1 || addressIndex === 2, `${name}: unsupported section row ${row[1]}`);
    assert.ok(/^[0-9a-fA-F]+$/.test(values[addressIndex + 2]), `${name}: unreadable section size ${row[1]}`);
    sections.push({ index: Number(row[1]), name: addressIndex === 2 ? values[0] : '', type: values[addressIndex - 1], vaddr: BigInt(`0x${values[addressIndex]}`), memsz: BigInt(`0x${values[addressIndex + 2]}`) });
  }
  assert.equal(sections.length, sectionCount, `${name}: incomplete LLVM section parse`);
  assert.ok(sections.every((section, index) => section.index === index), `${name}: noncontiguous section parse`);
  const block = text.split('Program Headers:')[1]?.split('Section to Segment mapping:')[0];
  assert.ok(block, `${name}: no LLVM program-header block`);
  const headers = [];
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trim().startsWith('Type ')) continue;
    // LLVM emits this descriptive continuation immediately after PT_INTERP.
    if (/^\s*\[Requesting program interpreter: [^\]\r\n]+\]\s*$/.test(line)) continue;
    const row = line.match(/^\s*(\S+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+(0x[0-9a-fA-F]+)\s+([RWE ]*)\s+(0x[0-9a-fA-F]+)\s*$/);
    assert.ok(row, `${name}: unreadable LLVM program row`);
    headers.push({ type: row[1], offset: BigInt(row[2]), vaddr: BigInt(row[3]), filesz: BigInt(row[5]), memsz: BigInt(row[6]), flags: row[7].replaceAll(' ', ''), align: BigInt(row[8]) });
  }
  assert.equal(headers.length, programCount, `${name}: incomplete LLVM program parse`);
  assert.ok(headers.some(header => header.type === 'LOAD'), `${name}: no LOAD segment`);
  return { headers, sections };
}

function fixtures() {
  const load = (vaddr, memsz, flags = 'RW', align = PAGE) => ({ type: 'LOAD', vaddr, memsz, flags, align, offset: vaddr % PAGE });
  const relro = (vaddr, memsz) => ({ type: 'GNU_RELRO', vaddr, memsz, flags: 'R', align: 1n, offset: 0n });
  const section = (vaddr, memsz, name = '.fixture') => ({ vaddr, memsz, name });
  const cases = [
    { name: 'whole-LOAD-unaligned-prefix-and-suffix', headers: [load(0xc8a0n, 0x760n), load(0x10d78n, 0x870n), relro(0xc8a0n, 0x760n)], sections: [section(0xc8a0n, 0x120n), section(0xcd78n, 0x288n), section(0x10d78n, 0x870n)], analyzer: true, overlap: true },
    { name: 'padded-whole-LOAD-including-zero-sized-marker', headers: [load(0x1970000n, 0xd4520n), load(0x1a48000n, 0x11c0f8n), relro(0x1970000n, 0xd5000n)], sections: [section(0x1970000n, 0xd4520n), section(0x1a44520n, 0n, '.bss.rel.ro'), section(0x1a48000n, 0x800n)], analyzer: true, overlap: true },
    { name: 'suffix-exception-with-earlier-writable-data', headers: [load(0x9000n, 0x4000n), load(0x14000n, 0x1000n), relro(0xc000n, 0x1000n)], sections: [section(0x9000n, 0x3000n), section(0xc000n, 0x1000n)], analyzer: true, overlap: true },
    { name: 'aligned-interior-RELRO', headers: [load(0x8000n, 0xc000n), relro(0xc000n, 0x4000n)], sections: [section(0x8000n, 0x4000n), section(0xc000n, 0x4000n), section(0x10000n, 0x4000n)], analyzer: true, overlap: true },
    { name: 'Adobe-true-bad-RELRO-non-suffix', headers: [load(0n, 0x50a30n, 'RE', 0x10000n), load(0x60c18n, 0x14a8n, 'RW', 0x10000n), relro(0x60c18n, 0x3e8n)], sections: [section(0x60c18n, 0x3e8n, '.relro'), section(0x61000n, 0x10c0n, '.data')], analyzer: false, overlap: false },
    { name: 'non-prefix-RELRO-protects-earlier-data', headers: [load(0x8000n, 0x8000n), relro(0x9000n, 0x3000n)], sections: [section(0x8000n, 0x1000n), section(0x9000n, 0x3000n), section(0xc000n, 0x4000n)], analyzer: false, overlap: false },
    { name: 'RELRO-bleeds-into-next-LOAD', headers: [load(0x8000n, 0x4000n), load(0xc000n, 0x4000n), relro(0x8000n, 0x5000n)], sections: [section(0x8000n, 0x4000n), section(0xc000n, 0x4000n)], analyzer: false, overlap: false },
    { name: 'RELRO-has-no-containing-LOAD', headers: [load(0x10000n, 0x4000n), relro(0x8000n, 0x4000n)], sections: [section(0x10000n, 0x4000n)], analyzer: false, overlap: true },
    { name: '4KB-LOAD-alignment-rejected', headers: [load(0x8000n, 0x4000n, 'RW', 4096n), relro(0x8000n, 0x4000n)], sections: [section(0x8000n, 0x4000n)], analyzer: false, overlap: true },
    { name: 'zero-sized-marker-prevents-false-section-equality', headers: [load(0x8000n, 0x6000n), relro(0x8000n, 0x5000n)], sections: [section(0x8000n, 0x4000n), section(0xd800n, 0n, '.marker')], analyzer: false, overlap: false },
    { name: 'equal-section-lists-do-not-hide-raw-writable-tail', headers: [load(0x8000n, 0x6000n), relro(0x8000n, 0x5000n)], sections: [section(0x8000n, 0x4000n)], analyzer: true, overlap: false },
    { name: 'whole-LOAD-exception-does-not-hide-rounded-next-LOAD', headers: [load(0xc800n, 0x800n), load(0xf100n, 0x100n), relro(0xc800n, 0x800n)], sections: [section(0xc800n, 0x800n), section(0xf100n, 0x100n)], analyzer: true, overlap: false },
  ];
  const results = cases.map(fixture => {
    const result = analyze(fixture);
    assert.equal(result.analyzerPass, fixture.analyzer, `${fixture.name}: analyzer predicate`);
    assert.equal(result.roundedRelroWritableOverlapPass, fixture.overlap, `${fixture.name}: independent writable overlap`);
    return { name: fixture.name, pass: true, analyzerPass: result.analyzerPass, roundedRelroWritableOverlapPass: result.roundedRelroWritableOverlapPass, problems: result.problems, overlaps: result.relro.flatMap(item => item.nonRelroWritableByteOverlaps) };
  });
  const llvmFixture = `ELF Header:
  Class:                             ELF64
  Data:                              2's complement, little endian
There are 2 section headers, starting at offset 0x100:
Section Headers:
  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  [ 1] .got              PROGBITS        0000000000008000 008000 004000 00  WA  0   0  8
There are 3 program headers, starting at offset 64
Program Headers:
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  LOAD           0x008000 0x0000000000008000 0x0000000000008000 0x004000 0x004000 RW  0x4000
  INTERP         0x000040 0x0000000000000040 0x0000000000000040 0x000015 0x000015 R   0x1
      [Requesting program interpreter: /system/bin/linker64]
  GNU_RELRO      0x008000 0x0000000000008000 0x0000000000008000 0x004000 0x004000 R   0x1
Section to Segment mapping:
`;
  const parsed = parseLlvm(llvmFixture, 'LLVM-fixture');
  assert.equal(parsed.sections.length, 2);
  assert.equal(parsed.sections[0].memsz, 0n);
  assert.equal(parsed.headers.length, 3);
  assert.equal(analyze(parsed).analyzerPass, true);
  assert.throws(() => parseLlvm(llvmFixture.replace('2 section headers', '3 section headers'), 'truncated'), /incomplete LLVM section parse/);
  assert.throws(() => parseLlvm(llvmFixture.replace('0x004000 RW', 'unreadable RW'), 'malformed'), /unreadable LLVM program row/);
  assert.throws(() => parseLlvm(llvmFixture.replace('ELF64', 'ELF32'), 'ELF32'), /expected ELF64/);
  assert.throws(() => parseLlvm(llvmFixture.replace('little endian', 'big endian'), 'big-endian'), /expected little endian/);
  results.push({ name: 'LLVM-parser-requires-ELF64LE-retains-null-zero-size-sections-and-INTERP-continuation-fails-closed-on-malformed-or-truncated-tables', pass: true });
  return results;
}

async function streamedLlvm(bundle, name, llvmPath) {
  const unzip = spawn('/usr/bin/unzip', ['-p', bundle, name]);
  const llvm = spawn(llvmPath, ['-WShl', '-']);
  let bytesStreamed = 0;
  let output = '';
  let unzipError = '';
  let llvmError = '';
  unzip.stdout.on('data', chunk => { bytesStreamed += chunk.length; });
  unzip.stderr.on('data', chunk => { unzipError += chunk; });
  llvm.stdout.on('data', chunk => { output += chunk; });
  llvm.stderr.on('data', chunk => { llvmError += chunk; });
  llvm.stdin.on('error', error => { llvmError += error.message; });
  const closed = child => new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  const waits = [closed(unzip), closed(llvm)];
  unzip.stdout.pipe(llvm.stdin);
  const [unzipCode, llvmCode] = await Promise.all(waits);
  if (unzipCode !== 0 || llvmCode !== 0 || llvmError) throw new Error(`${name}: unzip=${unzipCode}, llvm=${llvmCode}: ${unzipError}${llvmError}`);
  return { ...parseLlvm(output, name), bytesStreamed };
}

async function main() {
  const syntheticFixtures = fixtures();
  if (process.argv[2] === '--self-test') {
    console.log(JSON.stringify({ source: SOURCE_URL, fixtureCount: syntheticFixtures.length, syntheticFixtures }, null, 2));
    return;
  }
  const [bundle, llvmPath] = process.argv.slice(2);
  assert.ok(bundle?.startsWith('/') && llvmPath?.startsWith('/'), 'Usage: node inspect-android-aab-page-alignment.mjs /absolute/candidate.aab /absolute/llvm-readelf');
  const listing = spawnSync('/usr/bin/unzip', ['-Z1', bundle], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.equal(listing.status, 0, listing.stderr);
  const names = listing.stdout.split('\n').filter(name => /\/lib\/(arm64-v8a|x86_64)\/[^/]+\.so$/.test(name)).sort();
  assert.ok(names.length > 0 && new Set(names).size === names.length, 'Missing or duplicate 64-bit native entries');
  const sha256 = createHash('sha256');
  for await (const chunk of createReadStream(bundle)) sha256.update(chunk);
  const inspectedLibraries = [];
  for (const name of names) {
    const context = await streamedLlvm(bundle, name, llvmPath);
    inspectedLibraries.push({ name, bytesStreamed: context.bytesStreamed, parsedSectionHeaders: context.sections.length, zeroSizeSectionHeaders: context.sections.filter(section => section.memsz === 0n).length, ...analyze(context) });
  }
  const abiSummary = Object.fromEntries(['arm64-v8a', 'x86_64'].map(abi => {
    const libraries = inspectedLibraries.filter(item => item.name.includes(`/${abi}/`));
    return [abi, {
      libraries: libraries.length, loadSegments: libraries.reduce((total, item) => total + item.loadSegments, 0), relroSegments: libraries.reduce((total, item) => total + item.relroSegments, 0),
      minimumLoadAlignment: Math.min(...libraries.map(item => item.minimumLoadAlignment)),
      analyzerFailures: libraries.filter(item => !item.analyzerPass).length, strictLoadCongruenceFailures: libraries.filter(item => !item.strictLoadCongruencePass).length,
      roundedRelroWritableOverlapFailures: libraries.filter(item => !item.roundedRelroWritableOverlapPass).length,
      rawUnalignedRelroEnds: libraries.reduce((total, item) => total + item.relro.filter(segment => segment.rawEndMod16k !== 0).length, 0),
      equalContainedSections: libraries.reduce((total, item) => total + item.relro.filter(segment => segment.equalContainedSections).length, 0),
      bytesStreamed: libraries.reduce((total, item) => total + item.bytesStreamed, 0),
    }];
  }));
  const pass = Object.values(abiSummary).every(abi => abi.libraries > 0 && abi.analyzerFailures === 0 && abi.strictLoadCongruenceFailures === 0 && abi.roundedRelroWritableOverlapFailures === 0);
  console.log(JSON.stringify({
    schema: 'pluggd-static-google-pagealign-v1', artifact: bundle, artifactSha256: sha256.digest('hex'),
    primarySource: { url: SOURCE_URL, commit: SOURCE_COMMIT, blob: 'b779f82fdb07802dd1c72962852a3b4847df99de', predicateScope: 'ELF64 little-endian program and section headers, not final APK ZIP alignment' },
    method: 'Each ZIP entry streams directly from unzip to llvm-readelf -WShl -, sequentially, without native files or a whole-archive extraction; ELF64 little-endian headers and complete program/section tables are required.',
    pass, verdict: pass ? 'PASS: analyzer-equivalent ELF rules plus independent LOAD congruence and rounded RELRO writable-byte overlap checks' : 'FAIL: static ELF checks',
    runtime16k: 'PENDING: not installed or executed on a 16KB-page Android system',
    generatedPlayApk16kZipAlignment: 'PENDING: AAB configuration is not proof of final generated APK ZIP alignment',
    historicalModuloOnlyDiagnostics: 'Preserved. Raw RELRO end modulo 16KB alone omits primary analyzer whole-section and suffix exceptions; it is not a complete analyzer compatibility verdict.',
    abiSummary, syntheticFixtures, inspectedLibraries,
  }, null, 2));
  if (!pass) process.exitCode = 1;
}

await main();
