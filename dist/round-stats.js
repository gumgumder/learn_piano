export function summarizeAnswers(answers){
  return {
    correct:answers.filter(answer=>answer.correct).length,
    total:answers.length,
    averageMs:answers.length?answers.reduce((sum,answer)=>sum+answer.durationMs,0)/answers.length:0,
  };
}
