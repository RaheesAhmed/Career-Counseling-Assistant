const entryPromptTemplate = new PromptTemplate({
  template: "What's your name, age, and gender?",
});

const educationalBackgroundPromptTemplate = new PromptTemplate({
  template: "Could you please tell me about your current educational level?",
  inputVariables: ["educationalLevel"],
});

const subjectsPromptTemplate = new PromptTemplate({
  template: "Great! Now, could you share the subjects you've been studying?",
  inputVariables: ["subjects"],
});

const financialBackgroundPromptTemplate = new PromptTemplate({
  template: "How would you describe your family's financial background?",
  inputVariables: ["financialBackground"],
});
const strengthsWeaknessesPromptTemplate = new PromptTemplate({
  template: "Share your 3 strengths and 3 areas you'd like to improve?",
  inputVariables: ["strengths", "weaknesses"],
});

const futureGoalsPromptTemplate = new PromptTemplate({
  template: "What do you want to be in 5 years from now?",
  inputVariables: ["futureGoals"],
});

const additionalInformationPromptTemplate = new PromptTemplate({
  template:
    "Is there anything else you'd like to share that could help us provide you with personalized advice?",
  inputVariables: ["additionalInformation"],
});

const openEndedPromptTemplate = new PromptTemplate({
  template: "Would you like to ask anything specific?",
  inputVariables: ["openQuestion"],
});
