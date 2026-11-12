import { expect, it } from 'vitest';
import { accountDraftPayload } from './draft-payload';
const report={version:1,kind:'report',coordinates:{latitude:36,longitude:-81},step:4,fundingChoice:'500',customAmount:'',draft:{title:'Roadside bottles',types:'',selectedTypes:['Bottles'],severity:'Low',notes:'',selectedNotes:['Near roadside']}};
it('uses the same report and cleanup fields for both platforms',()=>{
  expect(accountDraftPayload(report,'report')).toEqual(report);
  const cleanup={version:1,kind:'cleanup',description:'Removed bottles',bagsOrItems:'2',weightPounds:'1.5',correctionDueAt:null};
  expect(accountDraftPayload(cleanup,'cleanup:attempt')).toEqual(cleanup);
});
it('rejects future, malformed or incompatible data before local replacement',()=>{
  for(const value of [{...report,version:2},{...report,coordinates:{latitude:NaN,longitude:0}},{...report,draft:{...report.draft,selectedTypes:'Bottles'}},{...report,step:9}]) expect(()=>accountDraftPayload(value,'report')).toThrow();
  expect(()=>accountDraftPayload(report,'cleanup:attempt')).toThrow();
});
it('retains optional cleanup hours while still opening older drafts', () => {
  const draft = {version:1,kind:'cleanup',description:'Removed bottles',bagsOrItems:'2',weightPounds:'5',correctionDueAt:null};
  expect(accountDraftPayload({...draft,hoursSpent:'1.5'},'cleanup:attempt')).toMatchObject({hoursSpent:'1.5'});
  expect(accountDraftPayload(draft,'cleanup:attempt')).toEqual(draft);
  for (const hoursSpent of [90, null, 'x'.repeat(21)]) expect(() => accountDraftPayload({...draft,hoursSpent},'cleanup:attempt')).toThrow();
});
