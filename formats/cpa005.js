import { toModernJulianDate } from '@cityssm/modern-julian-date';
function toJulianDate(date) {
    return '0' + toModernJulianDate(date).toString().slice(2);
}
function formatHeader(eftHeader) {
    const fileCreationJulianDate = toJulianDate(eftHeader.fileCreationDate ?? new Date());
    let dataCentre = ''.padEnd(5, ' ');
    if (eftHeader.destinationDataCentre !== undefined) {
        dataCentre = eftHeader.destinationDataCentre.padStart(5, '0');
    }
    let destinationCurrency = ''.padEnd(3, ' ');
    if (eftHeader.destinationCurrency !== undefined) {
        destinationCurrency = eftHeader.destinationCurrency;
    }
    return ('A' +
        '1'.padStart(9, '0') +
        eftHeader.originatorId.padEnd(10, ' ') +
        eftHeader.fileCreationNumber.padStart(4, '0').slice(-4) +
        fileCreationJulianDate +
        dataCentre +
        ''.padEnd(20, ' ') +
        destinationCurrency +
        ''.padEnd(1406, ' '));
}
export function formatToCPA005(eftGenerator) {
    const outputLines = [];
    outputLines.push(formatHeader(eftGenerator._header));
    let recordCount = 1;
    let record = '';
    let totalValueDebits = 0;
    let totalNumberDebits = 0;
    let totalValueCredits = 0;
    let totalNumberCredits = 0;
    for (const transaction of eftGenerator.getTransactions()) {
        for (let segmentIndex = 0; segmentIndex < transaction.segments.length; segmentIndex += 1) {
            if (segmentIndex % 6 === 0) {
                if (segmentIndex > 0) {
                    outputLines.push(record);
                }
                recordCount += 1;
                if (transaction.recordType === 'C') {
                    totalNumberCredits += 1;
                }
                else {
                    totalNumberDebits += 1;
                }
                record =
                    transaction.recordType +
                        recordCount.toString().padStart(9, '0') +
                        eftGenerator._header.originatorId.padEnd(10, ' ') +
                        eftGenerator._header.fileCreationNumber.padStart(4, '0');
            }
            const segment = transaction.segments[segmentIndex];
            const paymentJulianDate = toJulianDate(segment.paymentDate ?? new Date());
            let crossReferenceNumber = segment.crossReferenceNumber;
            if (crossReferenceNumber === undefined) {
                crossReferenceNumber =
                    'f' +
                        eftGenerator._header.fileCreationNumber +
                        'r' +
                        recordCount.toString() +
                        's' +
                        (segmentIndex + 1).toString();
            }
            record +=
                segment.cpaCode.toString() +
                    Math.round(segment.amount * 100)
                        .toString()
                        .padStart(10, '0') +
                    paymentJulianDate +
                    ''.padEnd(1, ' ') +
                    segment.bankInstitutionNumber.padStart(3, '0') +
                    segment.bankTransitNumber.padStart(5, '0') +
                    segment.bankAccountNumber.padEnd(12, ' ') +
                    ''.padStart(22, '0') +
                    ''.padStart(3, '0') +
                    eftGenerator._defaults.originatorShortName.padEnd(15, ' ').slice(0, 15) +
                    segment.payeeName.padEnd(30, ' ').slice(0, 30) +
                    eftGenerator._defaults.originatorLongName.padEnd(30, ' ').slice(0, 30) +
                    eftGenerator._header.originatorId.padEnd(10, ' ') +
                    crossReferenceNumber.padEnd(19, ' ').slice(0, 19) +
                    ''.padStart(1, '0') +
                    ''.padEnd(12, ' ') +
                    ''.padEnd(15, ' ') +
                    ''.padEnd(22, ' ') +
                    ''.padEnd(2, ' ') +
                    ''.padStart(11, '0');
            if (transaction.recordType === 'C') {
                totalValueCredits += segment.amount;
            }
            else {
                totalValueDebits += segment.amount;
            }
        }
        outputLines.push(record.padEnd(1464, ' '));
    }
    const trailer = 'Z' +
        (recordCount + 1).toString().padStart(9, '0') +
        eftGenerator._header.originatorId.padEnd(10, ' ') +
        eftGenerator._header.fileCreationNumber.padStart(4, '0').slice(-4) +
        Math.round(totalValueDebits * 100)
            .toString()
            .padStart(14, '0') +
        totalNumberDebits.toString().padStart(8, '0') +
        Math.round(totalValueCredits * 100)
            .toString()
            .padStart(14, '0') +
        totalNumberCredits.toString().padStart(8, '0') +
        ''.padEnd(1396, ' ');
    outputLines.push(trailer);
    return outputLines.join('\r\n');
}
