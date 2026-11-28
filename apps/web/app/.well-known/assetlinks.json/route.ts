const association = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.litterbugs.app',
      sha256_cert_fingerprints: [
        '2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E',
        // Google Play app signing: legacy, hybrid classical, and hybrid PQC.
        'E5:51:AA:13:DD:DD:20:36:4F:C3:35:2E:52:EC:52:ED:76:6F:BB:A2:80:D1:0E:21:9C:76:E4:0E:20:10:F4:1C',
        'C7:81:77:ED:5B:DA:A1:FA:D0:79:12:5B:4C:B4:E7:90:BB:C2:DD:CD:65:BA:58:CC:BF:63:96:4B:C2:9D:96:7D',
        '9A:F2:A1:62:27:AF:E3:EB:02:E1:32:A4:BB:19:11:38:C8:03:AF:73:F4:00:7F:C8:57:AC:4A:B1:29:1C:DA:DF',
      ],
    },
  },
];

export function GET() {
  return Response.json(association, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
