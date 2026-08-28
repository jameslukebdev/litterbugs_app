const association = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [
          'DB39U76V6Q.com.litterbugs.app',
          'RLXNU225W4.com.litterbugs.app',
        ],
        components: [
          {
            '/': '/reports/*',
            comment: 'Opens a shared Litterbugs report in the installed app.',
          },
        ],
      },
    ],
  },
};

export function GET() {
  return Response.json(association, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
