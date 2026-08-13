import {getStudentAttendanceRecords} from './attendance.service';
import {getStudentSubmissions} from './submissions.service';

export async function getTeacherStudentProfileRecords(studentId: string, classId: string) {
  const [attendance, submissions] = await Promise.all([
    getStudentAttendanceRecords(studentId),
    getStudentSubmissions(studentId, [classId]),
  ]);

  return {
    attendance: attendance.filter(record => record.classId === classId),
    submissions: submissions.filter(record => record.classId === classId),
  };
}
