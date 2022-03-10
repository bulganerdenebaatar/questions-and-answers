const { Pool } = require('pg')

const pool = new Pool({
  user: 'postgres',
  host: '54.86.52.119',
  database: 'sdc',
  password: '',
})

const getQuestions = (productId, callback) => {
  pool.query("SELECT q.id question_id, q.body question_body, q.date_written question_date, q.asker_name, q.helpful question_helpfulness, q.reported,(select json_object_agg(a.id, row_to_json(a)) from (SELECT id, body, date_written as date, answerer_name, helpful as helpfulness, (select json_agg(json_build_object('id', p.id, 'url', p.url)) from sdc.answers_photos as p where p.answer_id = sdc.answers.id)photos from sdc.answers where question_id = q.id) a) answers from sdc.questions as q where product_id=$1", [productId],
    (err, res) => {
    if (err) {
      console.log(err)
      callback(err);
    } else {
      const results = res.rows;
      callback(null, {"product_id": productId, results});
    }
  })
}
// POST /qa/questions
const addQuestion = (params, callback) => {
  // console.log('params', params)
  const { product_id, body, name, email } = params;
  const date_written = new Date();
  pool.query('INSERT INTO sdc.questions (product_id, body, asker_name, asker_email, date_written, reported, helpful) VALUES ($1 , $2 , $3 , $4, $5, $6, $7)', [ product_id, body, name, email, date_written, 0, 0 ], (err, res) => {
    if (err) {
      callback(err);
    } else {
      callback(null, res);
    }
  })
}

// GET /qa/questions/:question_id/answers
const getAnswers = (questionId, callback) => {
  pool.query(`
  select
    json_agg(
      json_build_object(
        'answer_id', a.id,
        'body', a.body,
        'date', a.date_written,
        'answerer_name', a.answerer_name,
        'helpfulness', a.helpful,
        'photos', t_answer_photos
        )
      )
    from
      sdc.answers a
      left join (
        select
          answer_id,
          json_agg(
            json_build_object(
              'id', ap.id,
              'url', ap.url
            )
          ) t_answer_photos
        from sdc.answers_photos ap
        group by answer_id
      ) ap on a.id = ap.answer_id
  WHERE a.question_id = ${questionId};`, (err, res) => {
    if (err) {
      callback(err);
    } else {
      const results = res.rows[0].json_agg
      callback(null, {"question": questionId, results});
    }
  })
}
// POST /qa/questions/:question_id/answers
const addAnswer = (params, callback) => {
  const { body, name, email, photos } = params.body;
  const questionId = params.questionId;
  const date_written = new Date();
  pool.query(`INSERT INTO sdc.answers (question_id, body, date_written, answerer_name, answerer_email, reported, helpful) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [ questionId, body, date_written, name, email, 0, 0 ], (err, res) => {
    if (err) {
      callback(err);
    } else {
      callback(null, res);
    }
  })
}

const updateQuestionHelpful = (questId, callback) => {
  pool.query(`UPDATE sdc.questions SET helpful= helpful+1  WHERE id=${questId};` , (err, res) => {
    if (err) {
      callback(err);
    } else {
      callback(null, res);
    }
  })
}

const reportQuestion = (questId, callback) => {
  pool.query(`UPDATE sdc.questions SET reported=1 WHERE id=${questId};` , (err, res) => {
    if (err) {
      callback(err);
    } else {
      callback(null, res);
    }
  })
}

const updateAnswerHelpful = (ansId, callback) => {
  pool.query(`UPDATE sdc.answers SET helpful=helpful+1  WHERE id=${ansId}` , (err, res) => {
    if (err) {
      callback(err);
    } else {
      callback(null, res);
    }
  })
}

//PUT /qa/answers/:answer_id/report
const reportAnswer = (ansId, callback) => {
  pool.query(`UPDATE sdc.answers SET reported=1 WHERE id=${ansId}` , (err, res) => {
    if (err) {
      callback(err);
    } else {
      callback(null, res);
    }
  })
}

module.exports = { getQuestions, getAnswers, addQuestion, addAnswer, updateQuestionHelpful, reportQuestion, updateAnswerHelpful, reportAnswer }