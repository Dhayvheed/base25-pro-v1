export type RivalryResult = "L" | "R";
export type RivalrySample = {
  id:string; leftPlayerId:string; rightPlayerId:string;
  leftName:string; rightName:string;
  leftFighterSlug:string; rightFighterSlug:string;
  leftFighterName:string; rightFighterName:string;
  results:RivalryResult[]; lastDate:string; totalMeetings:number;
};
export const RIVALRY_STATUS_CONFIG = {
  heatedMaxWinDifference:1,
  oneSidedMinimumShare:0.75,
  minimumMeetings:3,
} as const;
// TODO: connect to real data. These display-only examples are not match records.
export const RIVALRY_DATA_IS_SAMPLE = true;
export const SAMPLE_RIVALRY_TOTAL = 12;
export const SAMPLE_FEATURED_RIVALRY: RivalrySample = {
  id:"sample-moscow-oscar",leftPlayerId:"sample-moscow",rightPlayerId:"sample-oscar",
  leftName:"Moscow",rightName:"Oscar",leftFighterSlug:"scorpion",rightFighterSlug:"sub-zero",
  leftFighterName:"Scorpion",rightFighterName:"Sub-Zero",
  results:["L","R","L","L","R","R","L"],lastDate:"2026-11-28T19:10:00+01:00",totalMeetings:7,
};
export const SAMPLE_RIVALRIES: RivalrySample[] = [
 {id:"sample-jerrypound-oba",leftPlayerId:"sample-jerrypound",rightPlayerId:"sample-oba",leftName:"Jerrypound",rightName:"Oba",leftFighterSlug:"liu-kang",rightFighterSlug:"kitana",leftFighterName:"Liu Kang",rightFighterName:"Kitana",results:["L","R","R","L","R","L"],lastDate:"2026-11-28T14:20:00+01:00",totalMeetings:6},
 {id:"sample-cue-swift",leftPlayerId:"sample-cue-controller",rightPlayerId:"sample-swift",leftName:"Cue Controller",rightName:"swift",leftFighterSlug:"raiden",rightFighterSlug:"jax",leftFighterName:"Raiden",rightFighterName:"Jax",results:["L","L","R","L","L","R"],lastDate:"2026-11-27T20:40:00+01:00",totalMeetings:6},
 {id:"sample-sensei-deen",leftPlayerId:"sample-sensei",rightPlayerId:"sample-deen",leftName:"Sensei",rightName:"Deen",leftFighterSlug:"johnny-cage",rightFighterSlug:"sub-zero",leftFighterName:"Johnny Cage",rightFighterName:"Sub-Zero",results:["R","L","L","L","L","L"],lastDate:"2026-11-26T20:00:00+01:00",totalMeetings:6},
 {id:"sample-rochi-white",leftPlayerId:"sample-rochi",rightPlayerId:"sample-white",leftName:"Rochi",rightName:"White",leftFighterSlug:"scorpion",rightFighterSlug:"kitana",leftFighterName:"Scorpion",rightFighterName:"Kitana",results:["L","L","R","L"],lastDate:"2026-11-25T19:00:00+01:00",totalMeetings:4},
];
