/**
 * Departmental-style quarters points — NOT an official CSB calculator.
 * Formula is a local reference heuristic; treat output as unofficial.
 */
export function calculateQuartersPoints(input) {
  const salary = Math.max(0, Number(input.salary) || 0);
  const deadline = input.deadline;
  const appointment = input.appointment;
  const daysNotCounted = Math.max(0, Math.floor(Number(input.daysNotCounted) || 0));
  const maritalStatus = input.maritalStatus || '';
  const spouseResiding = input.spouseResiding === 'Yes';
  const childHK = Math.max(0, Math.floor(Number(input.childHK) || 0));
  const childOutside = Math.max(0, Math.floor(Number(input.childOutside) || 0));
  const childExpected = Math.max(0, Math.floor(Number(input.childExpected) || 0));

  const salaryPoints = salary > 0 ? salary / 538 : 0;

  let servicePoints = 0;
  let netDays = 0;
  if (deadline && appointment) {
    const totalDays = Math.floor(
      (new Date(`${deadline}T00:00:00`) - new Date(`${appointment}T00:00:00`)) /
        86400000,
    );
    netDays = Math.max(0, totalDays - daysNotCounted);
    servicePoints = (netDays / 365) * 6;
  }

  let spousePoints = 0;
  if (maritalStatus === 'Married' && spouseResiding) spousePoints = 20;

  let childHKPoints = 0;
  if (maritalStatus === 'Widowed' || maritalStatus === 'Separated' || maritalStatus === 'Divorced') {
    if (childHK > 0) childHKPoints = 20 + (childHK - 1) * 10;
  } else {
    childHKPoints = childHK * 10;
  }

  const childOutsidePoints = childOutside * 5;
  const childExpectedPoints = childExpected * 10;

  const ready = salary > 0 && deadline && appointment;
  const total =
    salaryPoints +
    servicePoints +
    spousePoints +
    childHKPoints +
    childOutsidePoints +
    childExpectedPoints;

  return {
    unofficial: true,
    ready,
    netDays,
    parts: {
      salary: salaryPoints,
      service: servicePoints,
      spouse: spousePoints,
      childHK: childHKPoints,
      childOutside: childOutsidePoints,
      childExpected: childExpectedPoints,
    },
    total,
  };
}
