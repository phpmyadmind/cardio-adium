const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// GET /api/reports/executive - Informe gerencial
router.get('/executive', async (req, res) => {
  try {
    const [users, events, speakers, questions, surveyResponses, surveyQuestions] = await Promise.all([
      query('SELECT * FROM users'),
      query('SELECT * FROM events'),
      query('SELECT * FROM speakers'),
      query('SELECT * FROM questions'),
      query('SELECT * FROM survey_responses'),
      query('SELECT * FROM survey_questions'),
    ]);

    const questionTextMap = new Map();
    const questionTextByKeyMap = new Map();
    surveyQuestions.forEach((sq) => {
      questionTextMap.set(sq.id, sq.question_text);
      questionTextByKeyMap.set(`${sq.day}-${sq.question_number}-${sq.question_type}`, sq.question_text);
    });

    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.is_admin).length;
    const totalRegularUsers = totalUsers - totalAdmins;
    const usersWithLastLogin = users.filter((u) => u.last_login).length;

    const usersBySpecialty = {};
    users.forEach((u) => {
      const s = u.specialty || 'Sin especialidad';
      usersBySpecialty[s] = (usersBySpecialty[s] || 0) + 1;
    });

    const usersByCity = {};
    users.forEach((u) => {
      const c = u.city || 'Sin ciudad';
      usersByCity[c] = (usersByCity[c] || 0) + 1;
    });

    const eventsByType = {};
    events.forEach((e) => {
      const t = e.type || 'sin tipo';
      eventsByType[t] = (eventsByType[t] || 0) + 1;
    });

    const eventsByDate = {};
    events.forEach((e) => {
      eventsByDate[e.date] = (eventsByDate[e.date] || 0) + 1;
    });

    const totalQuestions = questions.length;
    const approvedQuestions = questions.filter((q) => q.is_approved).length;
    const pendingQuestions = totalQuestions - approvedQuestions;
    const answeredQuestions = questions.filter((q) => q.is_answered).length;
    const unansweredQuestions = totalQuestions - answeredQuestions;

    const totalSurveyResponses = surveyResponses.length;
    const uniqueSurveyUsers = new Set(surveyResponses.map((r) => r.user_id).filter(Boolean)).size;
    const anonymousSurveyResponses = surveyResponses.filter((r) => !r.user_id).length;
    const averageRating =
      surveyResponses.length > 0
        ? surveyResponses.reduce((acc, r) => acc + r.rating, 0) / surveyResponses.length
        : 0;

    const responsesByDay = {};
    surveyResponses.forEach((r) => {
      responsesByDay[r.day] = (responsesByDay[r.day] || 0) + 1;
    });

    const responsesByQuestionText = {};
    surveyResponses.forEach((r) => {
      const qt =
        r.question_text ||
        questionTextMap.get(r.question_id) ||
        questionTextByKeyMap.get(`${r.day}-${r.question_number}-${r.question_type}`) ||
        r.question_type ||
        'Sin texto';
      if (!responsesByQuestionText[qt]) {
        responsesByQuestionText[qt] = { count: 0, totalRating: 0, questionNumber: r.question_number, dayDate: r.day_date, day: r.day };
      }
      responsesByQuestionText[qt].count += 1;
      responsesByQuestionText[qt].totalRating += r.rating;
    });

    const responsesByQuestionTypeWithAvg = Object.entries(responsesByQuestionText).map(
      ([type, d]) => ({
        type,
        count: d.count,
        averageRating: parseFloat((d.totalRating / d.count).toFixed(2)),
        questionNumber: d.questionNumber,
        dayDate: d.dayDate,
        day: d.day,
      })
    );

    const responsesBySpeaker = {};
    surveyResponses
      .filter((r) => r.speaker_name)
      .forEach((r) => {
        const s = r.speaker_name || 'Sin speaker';
        if (!responsesBySpeaker[s]) responsesBySpeaker[s] = { count: 0, totalRating: 0 };
        responsesBySpeaker[s].count += 1;
        responsesBySpeaker[s].totalRating += r.rating;
      });

    const responsesBySpeakerWithAvg = Object.entries(responsesBySpeaker)
      .map(([speaker, d]) => ({
        speaker,
        count: d.count,
        averageRating: parseFloat((d.totalRating / d.count).toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count);

    const ratingDistribution = {};
    surveyResponses.forEach((r) => {
      const rating = Math.round(r.rating);
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    const responsesByDate = {};
    surveyResponses.forEach((r) => {
      if (r.submitted_at) {
        const d = new Date(r.submitted_at).toISOString().split('T')[0];
        responsesByDate[d] = (responsesByDate[d] || 0) + 1;
      }
    });

    const responsesWithText = surveyResponses.filter(
      (r) => r.text_response && r.text_response.trim().length > 0
    ).length;
    const responsesWithoutText = totalSurveyResponses - responsesWithText;

    const responsesWithTextDetail = surveyResponses
      .filter((r) => r.text_response && r.text_response.trim().length > 0)
      .map((r) => {
        const qt =
          r.question_text ||
          questionTextMap.get(r.question_id) ||
          questionTextByKeyMap.get(`${r.day}-${r.question_number}-${r.question_type}`) ||
          r.question_type ||
          'Sin texto';
        return {
          userId: r.user_id || 'Anónimo',
          userName: r.user_name || 'Sin nombre',
          day: r.day,
          dayDate: r.day_date,
          questionNumber: r.question_number,
          questionType: qt,
          speakerName: r.speaker_name || null,
          rating: r.rating,
          textResponse: r.text_response,
          submittedAt: r.submitted_at,
        };
      });

    const userResponseCounts = {};
    surveyResponses
      .filter((r) => r.user_id)
      .forEach((r) => {
        if (!userResponseCounts[r.user_id]) {
          userResponseCounts[r.user_id] = { userId: r.user_id, userName: r.user_name || 'Sin nombre', count: 0 };
        }
        userResponseCounts[r.user_id].count += 1;
      });
    const topActiveUsers = Object.values(userResponseCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const dayStatsMap = {};
    surveyResponses.forEach((r) => {
      if (!dayStatsMap[r.day]) {
        dayStatsMap[r.day] = { count: 0, totalRating: 0, dayDate: r.day_date };
      }
      dayStatsMap[r.day].count += 1;
      dayStatsMap[r.day].totalRating += r.rating;
    });
    const dayStatsWithAvg = Object.entries(dayStatsMap).map(([day, d]) => ({
      day: parseInt(day),
      dayDate: d.dayDate,
      count: d.count,
      averageRating: parseFloat((d.totalRating / d.count).toFixed(2)),
    }));

    const ratings = surveyResponses.map((r) => r.rating).sort((a, b) => a - b);
    const minRating = ratings.length > 0 ? ratings[0] : 0;
    const maxRating = ratings.length > 0 ? ratings[ratings.length - 1] : 0;
    const medianRating =
      ratings.length > 0
        ? ratings.length % 2 === 0
          ? (ratings[ratings.length / 2 - 1] + ratings[ratings.length / 2]) / 2
          : ratings[Math.floor(ratings.length / 2)]
        : 0;

    const speakerVotesByDay = {};
    surveyResponses
      .filter((r) => r.speaker_name)
      .forEach((r) => {
        if (!speakerVotesByDay[r.day]) speakerVotesByDay[r.day] = {};
        const speaker = r.speaker_name || 'Sin speaker';
        if (!speakerVotesByDay[r.day][speaker]) {
          speakerVotesByDay[r.day][speaker] = {
            speaker,
            day: r.day,
            dayDate: r.day_date,
            votes: [],
            count: 0,
            totalRating: 0,
            ratings: [],
          };
        }
        const qt =
          r.question_text ||
          questionTextMap.get(r.question_id) ||
          questionTextByKeyMap.get(`${r.day}-${r.question_number}-${r.question_type}`) ||
          r.question_type ||
          'Sin texto';
        speakerVotesByDay[r.day][speaker].votes.push({
          userId: r.user_id || 'Anónimo',
          userName: r.user_name || 'Sin nombre',
          rating: r.rating,
          questionType: qt,
          questionNumber: r.question_number,
          textResponse: r.text_response,
          submittedAt: r.submitted_at,
        });
        speakerVotesByDay[r.day][speaker].count += 1;
        speakerVotesByDay[r.day][speaker].totalRating += r.rating;
        speakerVotesByDay[r.day][speaker].ratings.push(r.rating);
      });

    const speakerVotesByDayArray = Object.entries(speakerVotesByDay).map(([day, speakers]) => {
      const speakerList = Object.values(speakers);
      return {
        day: parseInt(day),
        dayDate: speakerList[0]?.dayDate || '',
        speakers: speakerList.map((s) => ({
          speaker: s.speaker,
          day: s.day,
          dayDate: s.dayDate,
          votes: s.votes,
          count: s.count,
          averageRating: parseFloat((s.totalRating / s.count).toFixed(2)),
          minRating: Math.min(...s.ratings),
          maxRating: Math.max(...s.ratings),
          medianRating:
            s.ratings.length > 0
              ? s.ratings.length % 2 === 0
                ? (s.ratings[s.ratings.length / 2 - 1] + s.ratings[s.ratings.length / 2]) / 2
                : s.ratings[Math.floor(s.ratings.length / 2)]
              : 0,
        })),
      };
    });

    const questionVotesByDay = {};
    surveyResponses.forEach((r) => {
      if (!questionVotesByDay[r.day]) questionVotesByDay[r.day] = {};
      const qt =
        r.question_text ||
        questionTextMap.get(r.question_id) ||
        questionTextByKeyMap.get(`${r.day}-${r.question_number}-${r.question_type}`) ||
        r.question_type ||
        'Sin texto';
      if (!questionVotesByDay[r.day][qt]) {
        questionVotesByDay[r.day][qt] = {
          questionType: qt,
          day: r.day,
          dayDate: r.day_date,
          votes: [],
          count: 0,
          totalRating: 0,
          ratings: [],
        };
      }
      questionVotesByDay[r.day][qt].votes.push({
        userId: r.user_id || 'Anónimo',
        userName: r.user_name || 'Sin nombre',
        rating: r.rating,
        questionNumber: r.question_number,
        speakerName: r.speaker_name,
        textResponse: r.text_response,
        submittedAt: r.submitted_at,
      });
      questionVotesByDay[r.day][qt].count += 1;
      questionVotesByDay[r.day][qt].totalRating += r.rating;
      questionVotesByDay[r.day][qt].ratings.push(r.rating);
    });

    const questionVotesByDayArray = Object.entries(questionVotesByDay).map(([day, questionTypes]) => {
      const qtList = Object.values(questionTypes);
      return {
        day: parseInt(day),
        dayDate: qtList[0]?.dayDate || '',
        questionTypes: qtList.map((q) => ({
          questionType: q.questionType,
          day: q.day,
          dayDate: q.dayDate,
          votes: q.votes,
          count: q.count,
          averageRating: parseFloat((q.totalRating / q.count).toFixed(2)),
          minRating: Math.min(...q.ratings),
          maxRating: Math.max(...q.ratings),
          medianRating:
            q.ratings.length > 0
              ? q.ratings.length % 2 === 0
                ? (q.ratings[q.ratings.length / 2 - 1] + q.ratings[q.ratings.length / 2]) / 2
                : q.ratings[Math.floor(q.ratings.length / 2)]
              : 0,
        })),
      };
    });

    const usersWithVotes = new Set(surveyResponses.map((r) => r.user_id).filter(Boolean));
    const usersWithoutVotes = users
      .filter((u) => !usersWithVotes.has(u.id))
      .map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        medicalId: u.medical_id,
        city: u.city || 'Sin ciudad',
        specialty: u.specialty || 'Sin especialidad',
        isAdmin: !!u.is_admin,
        createdAt: u.created_at,
        lastLogin: u.last_login,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const topSpecialties = Object.entries(usersBySpecialty)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([specialty, count]) => ({ specialty, count }));

    const topCities = Object.entries(usersByCity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    const usersByRegistrationDate = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    users
      .filter((u) => u.created_at && new Date(u.created_at) >= thirtyDaysAgo)
      .forEach((u) => {
        const d = new Date(u.created_at).toISOString().split('T')[0];
        usersByRegistrationDate[d] = (usersByRegistrationDate[d] || 0) + 1;
      });

    res.json({
      summary: {
        totalUsers,
        totalAdmins,
        totalRegularUsers,
        totalEvents: events.length,
        totalSpeakers: speakers.length,
        totalQuestions,
        totalSurveyResponses,
        uniqueSurveyUsers,
        anonymousSurveyResponses,
        averageRating: parseFloat(averageRating.toFixed(2)),
      },
      users: {
        total: totalUsers,
        admins: totalAdmins,
        regular: totalRegularUsers,
        withLastLogin: usersWithLastLogin,
        bySpecialty: usersBySpecialty,
        byCity: usersByCity,
        topSpecialties,
        topCities,
        byRegistrationDate: usersByRegistrationDate,
        withoutVotes: usersWithoutVotes,
        withoutVotesCount: usersWithoutVotes.length,
      },
      events: {
        total: events.length,
        byType: eventsByType,
        byDate: eventsByDate,
      },
      questions: {
        total: totalQuestions,
        approved: approvedQuestions,
        pending: pendingQuestions,
        answered: answeredQuestions,
        unanswered: unansweredQuestions,
      },
      surveys: {
        totalResponses: totalSurveyResponses,
        uniqueUsers: uniqueSurveyUsers,
        averageRating: parseFloat(averageRating.toFixed(2)),
        byDay: responsesByDay,
        byQuestionType: responsesByQuestionTypeWithAvg,
        bySpeaker: responsesBySpeakerWithAvg,
        ratingDistribution,
        byDate: responsesByDate,
        responsesWithText,
        responsesWithoutText,
        responsesWithTextDetail,
        topActiveUsers,
        dayStats: dayStatsWithAvg,
        minRating,
        maxRating,
        medianRating: parseFloat(medianRating.toFixed(2)),
        speakerVotesByDay: speakerVotesByDayArray,
        questionVotesByDay: questionVotesByDayArray,
      },
      speakers: { total: speakers.length },
    });
  } catch (err) {
    console.error('Error en GET /api/reports/executive:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
