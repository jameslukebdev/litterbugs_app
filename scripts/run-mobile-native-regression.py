#!/usr/bin/env python3
"""Run native checks and reject skipped coverage; restores device text size."""
import argparse, datetime, json, pathlib, subprocess, sys
p = argparse.ArgumentParser()
p.add_argument('--device', required=True)
p.add_argument('--suite', choices=['smoke','fixtures','large-text'], default='smoke')
a = p.parse_args()
root = pathlib.Path(__file__).resolve().parents[1]
run = lambda args, **kw: subprocess.run(args, check=True, **kw)
original = subprocess.check_output(['xcrun','simctl','ui',a.device,'content_size'],text=True).strip()
result = pathlib.Path('/tmp') / ('lb-native-'+a.suite+'-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'.xcresult')
scheme = 'LitterbugsFixtureRegression' if a.suite == 'fixtures' else 'LitterbugsUIRegression'
command = ['xcodebuild','-workspace','Litterbugs.xcworkspace','-scheme',scheme,'-configuration','Release','-destination','platform=iOS Simulator,id='+a.device,'-parallel-testing-enabled','NO','-resultBundlePath',str(result)]
large = 'LitterbugsUIRegression/LitterbugsUIRegression/testLargeTextMapControlsWithoutLocation'
command += ['-only-testing:'+large] if a.suite == 'large-text' else (['-skip-testing:'+large] if a.suite == 'smoke' else [])
try:
    run(['xcrun','simctl','ui',a.device,'content_size','accessibility-extra-extra-extra-large' if a.suite == 'large-text' else 'large'])
    with result.with_suffix('.log').open('w') as log:
        run(command+['test'],cwd=root/'apps/mobile/ios',stdout=log,stderr=subprocess.STDOUT)
    report = json.loads(subprocess.check_output(['xcrun','xcresulttool','get','test-results','summary','--path',str(result)],text=True))
    if report.get('skippedTests',0) or report.get('failedTests',0) or not report.get('passedTests',0):
        raise RuntimeError('Incomplete native coverage: '+json.dumps(report))
    print(json.dumps({'passed':report['passedTests'],'skipped':report.get('skippedTests',0),'result':str(result)}))
finally:
    run(['xcrun','simctl','ui',a.device,'content_size',original])
    run(['xcrun','simctl','location',a.device,'clear'])
