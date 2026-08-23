export function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export function isLiveProductionReservation(receipt, ownerIsAlive) {
  return receipt?.status === "reserved" && ownerIsAlive;
}
