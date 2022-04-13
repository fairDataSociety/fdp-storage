import { assertBase64UrlData, bmtHashBytes } from '../../../src/account/utils'

describe('account/utils', () => {
  it('bmtHashBytes', () => {
    const examples = [
      {
        data: [49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10],
        result: [
          170, 48, 49, 176, 134, 45, 216, 23, 196, 248, 186, 72, 69, 149, 226, 11, 124, 53, 215, 107, 198, 193, 148, 1,
          139, 120, 165, 161, 151, 116, 30, 239,
        ],
      },
      {
        data: [
          49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44,
          49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50,
          44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49,
          49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50,
          50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49,
          49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10,
          50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50,
          10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49,
          44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50,
          50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49,
          49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50,
          50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49,
          49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49,
          10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44,
          50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49,
          49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50,
          50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49,
          49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50,
          50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10,
          49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44,
          49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50,
          44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49,
          49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50,
          50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49,
          49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10,
          50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50,
          10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49,
          44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50,
          50, 44, 50, 10, 49, 49, 49, 49, 49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10, 49, 49, 49, 49,
          49, 49, 49, 44, 49, 10, 50, 50, 50, 50, 50, 50, 44, 50, 10,
        ],
        result: [
          158, 211, 230, 177, 197, 2, 197, 228, 226, 174, 179, 63, 0, 64, 171, 139, 111, 194, 203, 43, 159, 122, 59,
          145, 126, 37, 165, 114, 218, 201, 105, 178,
        ],
      },
    ]
    for (const example of examples) {
      const result = bmtHashBytes(new Uint8Array(example.data))
      expect(result.length).toEqual(32)
      expect(result.toString().split(',').map(Number)).toEqual(example.result)
    }
  })

  it('assertBase64Url', () => {
    const examples = [
      {
        data: 'dW5hYmxlIGJsZWFrIGNodW5rIHNhbGFkIHJlZmxlY3QgdW5mYWlyIGNyaWNrZXQgd2VpcmQgc3BpY2UgZ2F1Z2UgZGlhbCBmb3JnZXQ=',
      },
      {
        data: 'Y29sbGVjdCBjdXJ2ZSBzdGFkaXVtIHN3YW1wIHNuYWtlIG11c2hyb29tIGFyZWEgZXF1aXAgaW50byBldmlkZW5jZSBwYWlyIHRhbGVudA==',
      },
      {
        data: 'bWF0aCBzcGlkZXIgd29sZiBtaXJyb3Igc2lsayBidXR0ZXIga2luZ2RvbSBibGFtZSBmb3N0ZXIgbWFycmlhZ2UgZGlzZWFzZSBzbGVlcA==',
      },
      {
        data: 'c25pZmYgc2tpbiBhY3Jvc3MgbGF3IGVtYnJhY2UgcGFuZWwgY2xvd24gYmFieSBmYWRlIGNhbnZhcyB0b3dlciBiZWxvdw==',
      },
      {
        data: 'dG93YXJkIGVtZXJnZSB3b3J0aCBhbmNpZW50IHVudmVpbCB0eXBlIGRvbWFpbiBraWRuZXkgcGhyYXNlIG1vc3F1aXRvIGZsdXNoIGhvcnNl',
      },
      {
        data: 'ZWNobyB0b2RkbGVyIGdyYXBlIHVuZmFpciBzY3JhcCBoZWF2eSBmYW1pbHkgbm92ZWwgZGVlciByZWd1bGFyIGNvdXJzZSB1c2FnZQ==',
      },
      {
        data: 'cGllY2UgbW9vbiBpbmNsdWRlIHB1enpsZSBsb2NhbCB0cmFpbiByZWN5Y2xlIHZvY2FsIGNhbm5vbiBhZ2VudCBzdGVtIGdlbnJl',
      },
      {
        data: 'Y3J1bWJsZSBzZXR1cCByb3VnaCBwcm92aWRlIHBlYXNhbnQgZHJhc3RpYyBzdXJmYWNlIGhvYmJ5IGxpb24gYmV5b25kIGd1aXRhciB0b25pZ2h0',
      },
      {
        data: 'YW54aWV0eSBwZW9wbGUgb2JzZXJ2ZSBpdGVtIGNyZWFtIHNvbmcgZGVwZW5kIGNsYXAgdGVsbCB0cnVzdCB5b3UgcmVjYWxs',
      },
      {
        data: 'ZW1vdGlvbiB0aXNzdWUgZHJhZnQgZmVicnVhcnkgaG91ciBwb2V0IGFubnVhbCBjdXJyZW50IGludml0ZSBwb2VtIGxvdHRlcnkgc3VycHJpc2U=',
      },
      {
        data: 'Zm9vdCBsZWlzdXJlIGJlYXV0eSB0cnVtcGV0IHNjcmVlbiBtYW5kYXRlIGRlcHRoIGdhbGxlcnkgcGVhciBub3JtYWwgc2NpZW5jZSBzaXpl',
      },
      {
        data: 'YnJhaW4gYnJlYWQgdGlsdCBleWVicm93IHRpdGxlIGNoYWxrIGlsbG5lc3MgbXVsdGlwbHkgZGVjb3JhdGUgc2hhbGxvdyB0ZWFjaCB0ZXN0',
      },
      {
        data: 'd3JpdGUgc2FkIHB1bHAgY3JlYW0gY2FzZSB0dXJuIGNvdXJzZSBzaGlwIGhlZGdlaG9nIHNldmVuIGRpYWdyYW0gYW54aWV0eQ==',
      },
      {
        data: 'ZmlndXJlIHZvaWQgY2FydCBjb3VjaCBwYXVzZSByZW9wZW4gYmxlc3Mgc3ltYm9sIHRlbGwgcGF0cm9sIHJlY2VpdmUgY29uY2VydA==',
      },
      {
        data: 'Z29vc2UgY2FzdWFsIG1pc2VyeSBkZWJyaXMgZGVjbGluZSBpbXB1bHNlIGN1YmUga2luZCBnbG9yeSBnaWdnbGUgYm9tYiBkcmFzdGlj',
      },
      {
        data: 'Y3JvdWNoIGRpbm9zYXVyIHJlc3VsdCBqZWxseSBzYWZlIGZyaW5nZSBwZXQgbmFtZSBmZWRlcmFsIHRvd24gdXN1YWwgc2hvcA==',
      },
      {
        data: 'c2NhcmUgcXVhcnRlciBjYW5hbCBjdXJyZW50IHBlcmZlY3QgaGVhZCBlbmVteSBzYXVjZSBtaWxsaW9uIGhvbGxvdyBzaW1pbGFyIGNsZWFu',
      },
      {
        data: 'dW5pdmVyc2Ugc2luZyBsaWZ0IGdyYWNlIHBpY25pYyB0aXNzdWUgdW5kZXIgYXBhcnQgZm9yZXN0IGluY29tZSBzeXJ1cCBvdGhlcg==',
      },
      {
        data: 'b2x5bXBpYyBhZnJhaWQgdXNlZCBzdGVlbCBhcm91bmQgcHlyYW1pZCBsZWFkZXIgZGlhbW9uZCBpbnNwaXJlIGhhaXIgZWFnZXIgZnJlcXVlbnQ=',
      },
      {
        data: 'ZWdnIG1pbmQgZGV2aWNlIG5lZ2F0aXZlIGV4Y3VzZSB3aXNoIGdhdWdlIGNydW5jaCB2ZXJiIGJldHdlZW4gY2x1dGNoIGxvdW5nZQ==',
      },
      {
        data: 'ZG92ZSB3YW50IGNsaW1iIHJhbmdlIGdvd24gYnJvd24gd2lzZSBhcnJlc3QgaW5kZXggcHJpc29uIGJ1YmJsZSBvdmFs',
      },
      {
        data: 'Y2xhdyBnYXNwIHF1b3RlIHNvY2lhbCBvYWsgbGlxdWlkIGRlcHV0eSBkZXBlbmQgcmVncmV0IGFlcm9iaWMgY29yYWwgdmlkZW8=',
      },
      {
        data: 'c25pZmYgbG91bmdlIHNraW4gYm90dG9tIHBpbG90IHZhY3V1bSBzbG93IGNvcmUgd2ludGVyIGVyb3Npb24gcGVyc29uIG9yaWdpbmFs',
      },
      {
        data: 'bGFtcCBjcmVhbSBuZXV0cmFsIG1pcmFjbGUgb3BlbiBibGFua2V0IHZlcnkgZ29vZCByYW1wIHR1cm4gc25vdyBtaW1pYw==',
      },
      {
        data: 'dXBwZXIgY3J1aXNlIHNocnVnIHJvb20gbm92ZWwgZmVhdHVyZSByZXBhaXIgYWNjZXNzIHJhYmJpdCBmaXRuZXNzIGJlbG93IGtpdGU=',
      },
      {
        data: 'aGFyYm9yIGZsb29yIHZhbmlzaCBuYXJyb3cgYWR1bHQgcmV3YXJkIHNpZ24gc2l4IGZlYXR1cmUgZGV0ZWN0IGZsb29yIGNhcnJ5',
      },
      {
        data: 'bWF4aW11bSBjYXNlIGRlY2lkZSBmYXVsdCBzaHJpbXAgYWJsZSBwcm92aWRlIHBhbmVsIHBhdHRlcm4gc29ydCBtaW5vciBsZXR0ZXI=',
      },
      {
        data: 'ZG9jdG9yIG94eWdlbiB1dGlsaXR5IGJhYnkgc2hlcmlmZiBtdWx0aXBseSBidWRnZXQgbG9hZCBoZWRnZWhvZyByZW1haW4gbXVzdCBtYWNoaW5l',
      },
      {
        data: 'cGljbmljIGhlaWdodCB0cmFzaCBsYXRlciBmYXQgZXhoYXVzdCBub3NlIHNwYXRpYWwgZ29kZGVzcyB1bmFibGUgYWR2aWNlIHRvcA==',
      },
      {
        data: 'c3RyYXRlZ3kgbWltaWMgaW5jcmVhc2UgYmxhZGUgYnJvdGhlciBtYXBsZSB2aXNpdCB3aWxsIGVuZG9yc2UgY29vayBmcmVxdWVudCBtb3VudGFpbg==',
      },
      {
        data: 'ZGVwZW5kIHNlZWQgbm92ZWwgY2xvc2UgdGV4dCBmcmVzaCBtZXJpdCBiZXN0IGFzc2lzdCB3ZWVrZW5kIHRyYWNrIHN0b2Nr',
      },
      {
        data: 'YWdhaW4gY3Jhc2ggdG9uZ3VlIGNsb3NlIGVucmljaCBwaWdlb24gcHJhY3RpY2UgYnJvbnplIGxldHRlciBzaGFsbG93IHNrZXRjaCBsaXR0bGU=',
      },
      {
        data: 'ZWxib3cgdmlhYmxlIGdvd24gZW5hY3Qgb2N0b2JlciB1c2FnZSBqb2tlIGphenogYW5vdGhlciBnZW5pdXMgcmVsYXggaGlw',
      },
      {
        data: 'dG9wIG1hZ25ldCBzYW1wbGUgc2NhcmUgZGlub3NhdXIgd2VsY29tZSBzcG9vbiBkZWZlbnNlIGFzcGVjdCB1bnZlaWwgZWR1Y2F0ZSBzd2FybQ==',
      },
      {
        data: 'Zm9jdXMgc2lnbiBnYXJiYWdlIG1lbW9yeSBkdXR5IG91dGRvb3Igc3BvaWwgYW5zd2VyIG1vbSBlY29sb2d5IGVsZW1lbnQgd2Vi',
      },
      {
        data: 'cGlzdG9sIGNoYXJnZSBzcG9uc29yIG1hZ2ljIGFybWVkIGNyaWNrZXQgc2tldGNoIGZlZWwgdG9uZ3VlIHN3aWZ0IGZyYW1lIGNhbXA=',
      },
      {
        data: 'ZXJhc2UgaGludCBmYW1vdXMgZ3Jhdml0eSBzZWVkIGNvZmZlZSBmbHkgb3JhbmdlIGlzb2xhdGUgY2xlYW4gc29sZGllciBiZWhpbmQ=',
      },
      {
        data: 'Y291c2luIGdsb3J5IGxhZGRlciBhYm91dCBvbWl0IGNsYXkgYnVzIGNoYW9zIGp1bmdsZSB3b3JkIGhvbGlkYXkgbWVzaA==',
      },
      {
        data: 'aW5jaCBzaG9jayBjbGV2ZXIgcmVtYWluIHNvbWVvbmUgY2F1dGlvbiBkb3NlIHBhcmFkZSBjaGlja2VuIG1ham9yIGdsb3ZlIGluY29tZQ==',
      },
      {
        data: 'YWNjdXNlIG92ZXIgcmVwYWlyIGVmZm9ydCBjeWNsZSBub2lzZSBzdXBwbHkgc2hvcnQgc2lnaHQgb25pb24gc25pZmYgY29zdA==',
      },
      {
        data: 'dmFyaW91cyBhcm1vciBlc3RhdGUgdHJhaW4gcHJlZGljdCBzaGVyaWZmIGhhcmQgbG9jYWwgYWN0cmVzcyBjYXZlIHNoYWxsb3cgcGFjdA==',
      },
      {
        data: 'YWRhcHQgc3Vid2F5IHZpY3Rvcnkgc3RhbmQgdG93ZXIgZ2VudGxlIGFic3VyZCBub3JtYWwgcmVwb3J0IGZyb3duIHB1cmNoYXNlIGdydW50',
      },
      {
        data: 'Ym91bmNlIHZpcnVzIHJlbHkgZmFjdWx0eSBkaXZvcmNlIGJvb3N0IG9ubGluZSBuZXV0cmFsIGdlc3R1cmUgcGVuIGNhcnJ5IHF1ZXN0aW9u',
      },
      {
        data: 'Z3Vlc3MgbWFzcyBncm91cCByYWxseSBlbmFjdCB0aGlzIHZpc2EgYXVjdGlvbiBleGNlc3MgZ2FsYXh5IHRyeSBxdWl6',
      },
      {
        data: 'cmVzZW1ibGUgY29yYWwgc3VzcGVjdCBjaGlja2VuIGJsYXN0IHJlc3BvbnNlIHRyYW5zZmVyIHRpdGxlIGNvcnJlY3QgZ293biBtZWNoYW5pYyBwbGVhc2U=',
      },
      {
        data: 'c2VhcmNoIHRvcm5hZG8gZnJvZyBtZW50aW9uIHRhcGUgcmFpbiBpbm5vY2VudCBhZGp1c3QgZGlnaXRhbCBzaWRlIGJsdXIgY2FudmFz',
      },
      {
        data: 'cHVyaXR5IG5vcnRoIHRpbWUgbGVvcGFyZCBwb3N0IG5vc2UgYXJtb3Igc2VjcmV0IGh1Z2UgYnJhbmQgcGFycm90IGFwcGxl',
      },
      {
        data: 'YW54aWV0eSBwb3J0aW9uIGV4aXN0IG1hcmJsZSB0cmFkZSByZWFzb24gY290dG9uIHlhcmQgcGFycm90IGR1dGNoIHBhdHRlcm4gdG9tYXRv',
      },
      {
        data: 'd2hpc3BlciB0b3AgcmVmbGVjdCBvbmNlIHdpbnRlciBkdXRjaCBwaXRjaCBoZWRnZWhvZyB3YXJyaW9yIGh1bmdyeSBkaXNjb3ZlciBrbmVl',
      },
      {
        data: 'aGlnaCByZW1lbWJlciB0aWNrZXQgY2hhdCByZWNpcGUgYmV5b25kIHJlcGFpciBleHBvc2Ugc2luY2UgZ3JhcGUgc2luY2UgYnJpZGdl',
      },
      {
        data: 'd3JvbmcgZXhpc3Qgd2luZSBpbml0aWFsIGhlbG1ldCBleGFtcGxlIG1hZCBtb3ZpZSB3aGVyZSBuZXdzIG1hdHJpeCBydWxl',
      },
      {
        data: 'bWFuc2lvbiBmZWJydWFyeSBwYXR0ZXJuIHZlcmlmeSBleGFjdCBqb3VybmV5IGZsYWcgaG9tZSBnbG9iZSBlbmxpc3Qgc2NydWIgZXhwb3Nl',
      },
      {
        data: 'YmlvbG9neSBnYXNwIHdlc3QgcmlkZSBiYWJ5IGxvYnN0ZXIgcHVyaXR5IGN1cmlvdXMgc3ByZWFkIHNheSBleGVjdXRlIHBhY3Q=',
      },
      {
        data: 'c2F1c2FnZSBzcGxpdCBndWl0YXIgbmVhciBleG90aWMgdGhleSB0b3BpYyByZXVuaW9uIGNodXJuIGV4cHJlc3Mgc2lsayBmaW5pc2g=',
      },
      {
        data: 'ZW5yb2xsIGxlYXJuIGFuaW1hbCBkYW1wIGRpZ2l0YWwgc3dhcm0gdXNlZnVsIGJlbHQgdG93YXJkIHdvbmRlciBmdWVsIGdlbml1cw==',
      },
      {
        data: 'dHJpcCBsb25nIHJvb2tpZSB2YWNhbnQgbGFiZWwgcGF1c2UgbmV0IHRyYXAgdmlzYSBzb3J0IGZsb29yIGFyY2g=',
      },
      {
        data: 'Y2x1c3RlciBzbGlnaHQgc3RpbGwgc3VnYXIgZHVuZSBncmllZiBjYWJsZSB3b25kZXIgc3RlZWwgY2FsbSBjYWxtIGludm9sdmU=',
      },
      {
        data: 'c3BvbnNvciBlbnRyeSByZW1pbmQgcmVjYWxsIHNwaXJpdCB6b28gZ2VuaXVzIHJvY2tldCBhcnRlZmFjdCBkZXB0aCBidWlsZCBmcmFnaWxl',
      },
      {
        data: 'cHJvcGVydHkgbGljZW5zZSB0YW5rIHZpc2l0IGZydWl0IHRhdHRvbyBicm9rZW4gc3R1ZGVudCBwdXJwb3NlIHNjaXNzb3JzIGNyYWNrIGhvdXI=',
      },
      {
        data: 'dGVsbCByYXpvciBob3BlIGRldm90ZSBleGNoYW5nZSBkaWxlbW1hIHRodW1iIHBhbmljIHNlYXJjaCBob3ZlciByaW90IG5hdHVyZQ==',
      },
      {
        data: 'bWF6ZSBzYWRuZXNzIGV4aWxlIG5vYmxlIHNlYXJjaCBzcGF3biBtYWQgcmFkaW8gdW5mYWlyIGFpcnBvcnQgZGlzdGFuY2UgdHJlZQ==',
      },
      {
        data: 'YW5nZXIgcGhvbmUgc3BpbiBzdW1tZXIgbWl4ZWQgYWRkIGluZGV4IHN0aW5nIG15c3RlcnkgY3VydmUgZGlhbCBjdWJl',
      },
      {
        data: 'cnViYmVyIHNvY2lhbCBidW5kbGUgYmVuY2ggdmVyc2lvbiB0YXJnZXQgYXR0ZW5kIHJlbWFpbiB0YWxlbnQgbGF0aW4gY2FuIG1peGVk',
      },
      {
        data: 'dHJlYXQgYXJyZXN0IHRlbm5pcyBidWRnZXQgYW50aXF1ZSBzbGFtIGRlbnRpc3QgZmlndXJlIHJlYWwgbmV2ZXIgZXZpZGVuY2Ugd29sZg==',
      },
      {
        data: 'YXZvY2FkbyBtYXR0ZXIgYmF0dGxlIG5pY2UgY3JvcCBmbGVlIGFyZW5hIHJvYWQgbWFqb3IgZHluYW1pYyBleGVyY2lzZSBsb3R0ZXJ5',
      },
      {
        data: 'YmVjYXVzZSBraW5kIGZvcndhcmQgYW50ZW5uYSByZXRpcmUgc25ha2UgbHVja3kgZmxhdCBvZnRlbiBzaGFmdCBwbGF0ZSBtZW1iZXI=',
      },
      {
        data: 'ZGVhbCByZXBlYXQgY3J1bWJsZSB3ZWRkaW5nIHJhbmdlIHB1cnBvc2UgY2hyb25pYyBvdXRkb29yIGRvbGwgbWlzZXJ5IGZhaW50IHNwbGl0',
      },
      {
        data: 'bm90aGluZyBjZWlsaW5nIGZvcnR1bmUgZWFzaWx5IGhhbGYgaGFuZCBhcG9sb2d5IGdhcmRlbiBqdW5pb3IgbWVudSB2aXJ1cyBuZXJ2ZQ==',
      },
      {
        data: 'cmVvcGVuIHlvdXRoIHdpbGwgc29sYXIgY29sb3IgY2hhbXBpb24gZXJ1cHQgZ2VuaXVzIHBpY3R1cmUgdW51c3VhbCBzaG9wIG1pZG5pZ2h0',
      },
      {
        data: 'ZXhjZXNzIHJ1ZGUgc2FmZSBlbWVyZ2Ugc2V2ZW4gc3RlbSB2YWd1ZSBvcnBoYW4gbG95YWwgdXN1YWwgY3J5c3RhbCBkb25rZXk=',
      },
      {
        data: 'aWNlIGNoYXNlIHN3b3JkIHdhbnQgYmFzaWMgcHJvZ3JhbSB3aW50ZXIgd2FnZSBkb29yIGlzc3VlIGNyYXNoIGRldmljZQ==',
      },
      {
        data: 'd2lzZSB0YW5rIGRvbHBoaW4gcGVuYWx0eSBmZWVsIHRvYmFjY28gZWxzZSBmZWVkIGZ1biB2b2x1bWUgY2l2aWwgYXdheQ==',
      },
      {
        data: 'c3BhY2UgdmlzYSBzaXJlbiBkb21haW4gYnVkZ2V0IGZldmVyIHNoaW5lIHN3YXJtIGVhc2lseSBuZXh0IGFkZCBzdHVkZW50',
      },
      {
        data: 'bGVtb24gZm9vZCBtaW51dGUgcHJhY3RpY2Ugc3dhcCBlaWdodCBub3J0aCBwbGVkZ2UgdHJ1c3QgaW1wdWxzZSBoaXAgZnJvc3Q=',
      },
      {
        data: 'bW9zcXVpdG8gd2luZyBsYWtlIHJpc2sgc2hyaW1wIHdlYWx0aCBpdGVtIGltYWdlIHRyaWdnZXIgY2xldmVyIHRhbGVudCBjYXBpdGFs',
      },
      {
        data: 'c3Bvb24gaGVybyB0d2luIHNhZmUgaW5oZXJpdCBjYXBhYmxlIHR3aWNlIHNpeCBzeXJ1cCBoZWFkIHR1bWJsZSBjbHVzdGVy',
      },
      {
        data: 'ZWxldmF0b3IgbW9vbiBtb3ZlIGRyYWdvbiBtZWFuIGRhc2ggcHJlZmVyIGxha2UgcmVwYWlyIGd1ZXNzIG1lbWJlciB2YW4=',
      },
      {
        data: 'Y2FzaCBhYmFuZG9uIHJhY2Nvb24gY3JldyByZXRyZWF0IHRob3VnaHQgY2hvaWNlIHRvbmUgb3JwaGFuIGVhc2lseSBzaGllbGQgY29sbGVjdA==',
      },
      {
        data: 'c3Ryb25nIGdvdmVybiBzcGljZSBnb2RkZXNzIHBhdGllbnQgbGFkeSBjb25maXJtIGNhYmxlIHVwcGVyIG1vbWVudCB0cmFpbiBiZXlvbmQ=',
      },
      {
        data: 'cmVjb3JkIGdyYWIgYWNxdWlyZSB2ZW5kb3IgbmlnaHQgaGlsbCBuaWNlIGJhbGFuY2UgcHVsbCBoZWF2eSBzaGllbGQgc2hhZnQ=',
      },
      {
        data: 'c3BlbmQgY2FuIGhlbGxvIGV4cG9zZSBnbG93IGRpZ25pdHkgd2hhbGUgY3VydGFpbiBzbGljZSBpY29uIHRyaWNrIGVuYWJsZQ==',
      },
      {
        data: 'bWlycm9yIGRlZnkgdGlwIGZsdXNoIG1hY2hpbmUgdGhhbmsgbGFuZ3VhZ2UgYWxvbmUgb3JhbmdlIG1vbWVudCBnZW5pdXMgaGVybw==',
      },
      {
        data: 'YWRtaXQgZGlmZmVyIGZpYmVyIGNhbnlvbiBwdWRkaW5nIGdhcmRlbiBleGNoYW5nZSBjb3lvdGUgZ3JhbnQgbnVjbGVhciBwZW9wbGUgam9i',
      },
      {
        data: 'cHJpc29uIGJhciB3aXNlIHRlbGwgbWFuZGF0ZSBhd2FyZSBjcml0aWMgdGhpcyBzdWNoIGltcG9zZSBmaW5pc2ggZmVlZA==',
      },
      {
        data: 'dGF4aSBhbWF6aW5nIHNxdWVlemUgZ2xvYmUgcml2ZXIgdmlsbGFnZSBjcmFjayBub3J0aCB2ZXJiIHVwZ3JhZGUgZ2hvc3QgaWRlbnRpZnk=',
      },
      {
        data: 'Y2xhdyBuZXQgd2V0IGN1bHR1cmUgZnJpbmdlIGdyaWQgcml2YWwgY2FwaXRhbCBjb21lIGxheWVyIGhvbGlkYXkgY29ybg==',
      },
      {
        data: 'cmV3YXJkIHRyYWdpYyBwcm9ibGVtIHNpdHVhdGUgcmFpbiBzbGFiIGJvaWwgc3Bpcml0IGhhaXIgaWRsZSBvbGl2ZSBvbmNl',
      },
      {
        data: 'd2lsbCB0aW1lIGhvdGVsIGV2b2x2ZSBtb3VzZSBsdWdnYWdlIHNjb3JwaW9uIGJhbGwgZ3JhbnQgbWFuYWdlIHBhcmsgZXhwaXJl',
      },
      {
        data: 'cXVhbGl0eSBicmlkZ2UgbWF0aCBzd2l0Y2ggbGliZXJ0eSBjYXIgdXBwZXIgaGF6YXJkIHdhcm0gdmFsbGV5IGlsbGVnYWwgcGlvbmVlcg==',
      },
      {
        data: 'a2lkIHJhbGx5IHJhdmVuIHdpbmUgbWFtbWFsIG5hdGlvbiByZXVuaW9uIGhhemFyZCB0cmFjayB0aHJvdyBmb2xsb3cgZm9pbA==',
      },
      {
        data: 'YWxpZW4gbGF3IGNhbm9lIG9mZiBmYW50YXN5IGJhdHRsZSBwaWNuaWMgdG9hc3QgY2FrZSBtaW5pbXVtIGJ1aWxkIGV4aXN0',
      },
      {
        data: 'YnJvdGhlciBzZW1pbmFyIGNyaW1lIHNpdHVhdGUgZHVtYiBwb2ludCBlY2hvIHBvcnRpb24gbmFtZSBmdW5ueSB0YXhpIGxhdGlu',
      },
      {
        data: 'dHJpY2sgY29kZSBidXllciBmbHkgaXNsYW5kIHN5bXB0b20gZ3JpZWYgdGFja2xlIHBvbGFyIHZvY2FsIGFycml2ZSBpbmhlcml0',
      },
      {
        data: 'ZnVuIHVuZGVyIGd1biBjdXJ2ZSB0ZW50IGd1aWx0IGZlZWQgc29vbiBlbmFibGUgaW5qZWN0IG1hcmtldCBsaWFy',
      },
      {
        data: 'd3JhcCBsZWFybiBjbG93biBmZWF0dXJlIHBhdXNlIHN1cHBseSBpbnRvIGp1aWNlIGJlbGlldmUgcHVsbCBjbHVtcCBtZWFkb3c=',
      },
      {
        data: 'Y3J1ZWwgcHJldHR5IHZhY2FudCBwZXBwZXIgYWx0ZXIgdmFsbGV5IHRlcm0gZGlzb3JkZXIgYmxvb2QgaG9sZSBhZGQgZGVwdGg=',
      },
      {
        data: 'ZGlyZWN0IHJpdHVhbCBmYXRoZXIgbWVtb3J5IGFtYXppbmcgcm9vZiBvYmxpZ2UgYnVkZ2V0IHVyZ2UgY29zdCBjb2luIG1hemU=',
      },
      {
        data: 'bGVhdmUgcGlsbCBjb3JuIGRpcmVjdCBhYm92ZSBvYmplY3Qgc2NoZW1lIHdvb2wgaGF2ZSBkZXJpdmUgc3BpbiBleGNlc3M=',
      },
      {
        data: 'bXVjaCBlYXN0IGxhdGVyIGxldHRlciBjb21pYyBzaGFmdCBlbmxpc3QgZW5vdWdoIGNhbm5vbiBmaWVsZCB0cmlwIHRyaW0=',
      },
      {
        data: 'O5NEwYReE5OH8QLXqGK1UI75MTAlagSDeIA_zufgPENXGnv9rcvHlmHbtxdgNlLNDyYuarDeQUZmf2TkuxFOtRX2uiEJivSTdR-88uWqoTUebeNB8GCP8PogZSo=',
      },
      {
        data: 'QQTkpXg-KlSDb3isJ5mJ44pnGo8qXowrnV9yQTsWeE6k8_exszms1zaGekGeKB5DhDuFKuaZO8sW1ZmTlieGKidrk4BIBQPteh-VFoWYGquZY6fKp2JNNiPjZWckJvvygq0=',
      },
      {
        data: 'Hello world',
        isError: true,
        message: 'Incorrect symbols in Base64Url data',
      },
      {
        data: '',
        isError: true,
        message: 'String is empty',
      },
      {
        data: 'cmlkZSBzY2FuIGJhY2hlbG9yIGJlbmVmaXQgYXJ0aXN0IGJhcmdhaW4gbGFiIHRvZGF5IGV4b3RpYyBqb3kgZW5lcmd5IGRlY3JlYXNl+',
        isError: true,
        message: 'Incorrect symbols in Base64Url data',
      },
      {
        data: 'cmlkZSBzY2FuIGJhY2hlbG9yIGJlbmVmaXQgYXJ0aXN0IGJhcmdhaW4gbGFiIHRvZGF5IGV4b3RpYyBqb3kgZW5lcmd5IGRlY3JlYXNl/',
        isError: true,
        message: 'Incorrect symbols in Base64Url data',
      },
    ]

    for (const example of examples) {
      if (example.isError) {
        expect(() => {
          assertBase64UrlData(example.data)
        }).toThrow(example.message)
      } else {
        assertBase64UrlData(example.data)
      }
    }
  })
})
