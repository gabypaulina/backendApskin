module.exports = [
    {
        id: 1,
        question: 'Apa jenis kulit anda?',
        answers: [
          {
            type: 'image',
            content: 'jenis_kulit/normal.png',
            text: 'Normal: tidak kering dan tidak berminyak'
          },
          {
            type: 'image',
            content: 'jenis_kulit/kering.png',
            text: 'Kering: sering gatal, terasa kencang, bersisik, pecahpecah'
          },
          {
            type: 'image',
            content: 'jenis_kulit/kombinasi.png',
            text: 'Kombinasi: T-zone berminyak bagian lain kering atau normal'
          },
          {
            type: 'image',
            content: 'jenis_kulit/berminyak.png',
            text: 'Berminyak: pori-pori besar, berkomedo'
          },
          {
            type: 'image',
            content: 'jenis_kulit/sensitif.png',
            text:
            'Sensitif: mudah kemerahan dan iritasi, bisa gatal dan nyeri/nyeri memakai produk'
          },
        ],
      },
      {
        id:2,
        question: 'Bagaimana kondisi kulit anda hari ini?',
        answers: [
          {
            type: 'image',
            content: 'kondisi_kulit/jerawat.png',
            text: 'JERAWAT'
          },
          {
            type: 'image',
            content: 'kondisi_kulit/kusam.png',
            text: 'KUSAM'
          },
          {
            type: 'image',
            content: 'kondisi_kulit/kerutan.png',
            text: 'KERUTAN'
          },
          {
            type: 'image',
            content: 'kondisi_kulit/flekhitam.png',
            text: 'FLEK HITAM'
          },
          {
            type: 'image',
            content: 'kondisi_kulit/kemerahan.png',
            text: 'KEMERAHAN'
          },
          {
            type: 'image',
            content: 'kondisi_kulit/mengelupas.png',
            text: 'MENGELUPAS'
          },
        ],
      },
      {
        id:3,
        question: 'Seberapa sering menggunakan sunscreen?',
        answers: [
          {
            type: 'text',
            content: 'Setiap berapa jam sekali',
            text: 'Setiap berapa jam sekali'
          },
          {
            type: 'text',
            content: 'Kadang-kadang',
            text: 'Kadang-kadang'
          },
          {
            type: 'text',
            content: 'Jarang',
            text: 'Jarang'
          },
          {
            type: 'text',
            content: 'Tidak pernah',
            text: 'Tidak pernah'
          },
        ],
      },
      {
        id: 4,
        question: 'Apakah sering terpapar polusi dan sinar matahari?',
        answers: [
          {
            type: 'image',
            content: 'emotikon/ya.png',
            text: 'Ya'
          },
          {
            type: 'image',
            content: 'emotikon/tidak.png',
            text: 'Tidak'
          },
        ],
      },
      {
        id:5,
        question: 'Apakah rutin menggunakan skincare?',
        answers: [
          {
            type: 'text',
            content: 'Rajin',
            text: 'Rajin'
          },
          {
            type: 'text',
            content: 'Kadang-kadang',
            text: 'Kadang-kadang'
          },
          {
            type: 'text',
            content: 'Jarang',
            text: 'Jarang'
          },
          {
            type: 'text',
            content: 'Tidak pernah',
            text: 'Tidak pernah'
          },
        ],
      },
      {
        id:6,
        question: 'Bagaimana kebiasaan makanan anda sehari-hari',
        answers: [
          {
            type: 'image',
            content: 'makanan/cepatsaji.png',
            text: 'cepat saji'
          },
          {
            type: 'image',
            content: 'makanan/manis.png',
            text: 'makanan manis'
          },
          {
            type: 'image',
            content: 'makanan/seimbang.png',
            text: 'seimbang'
          },
          {
            type: 'image',
            content: 'makanan/vegetarian.png',
            text: 'vegetarian'
          },
        ],
      },
      {
        id:7,
        question: 'Seberapa sering anda mengonsumsi makanan cepat saji?',
        answers: [
          {
            type: 'text',
            content: 'Setiap hari',
            text: 'Setiap hari'
          },
          {
            type: 'text',
            content: 'Beberapa kali seminggu',
            text: 'Beberapa kali seminggu'
          },
          {
            type: 'text',
            content: 'Jarang',
            text: 'Jarang'
          },
          {
            type: 'text',
            content: 'Tidak pernah',
            text: 'Tidak pernah'
          },
        ],
      },
      {
        id: 8,
        question: 'Minuman apa yang paling sering dikonsumsi?',
        answers: [
          {
            type: 'image',
            content: 'minuman/airputih.png',
            text: 'Air putih'
          },
          {
            type: 'image',
            content: 'minuman/kopiteh.png',
            text: 'Kopi/teh'
          },
          {
            type: 'image',
            content: 'minuman/manissoda.png',
            text: 'Minuman manis/soda'
          },
          {
            type: 'image',
            content: 'minuman/susu.png',
            text: 'Susu'
          },
          {
            type: 'image',
            content: 'minuman/jus.png',
            text: 'Jus'
          },
        ],
      },
      {
        id: 9,
        question: 'Berapa rata-rata durasi tidur per hari?',
        answers: [
          {
            type: 'text',
            content: '< 5 jam',
            text: '< 5 jam'
          },
          {
            type: 'text',
            content: '5 - 6 jam',
            text: '5 - 6 jam'
          },
          {
            type: 'text',
            content: '7 - 8 jam',
            text: '7 - 8 jam'
          },
          {
            type: 'text',
            content: '> 8 jam',
            text: '> 8 jam'
          },
        ],
      },
      {
        id:10,
        question: 'Apakah anda sering mengalami gangguan tidur?',
        answers: [
          {
            type: 'text',
            content: 'Normal',
            text: 'Normal'
          },
          {
            type: 'text',
            content: 'Insomnia',
            text: 'Insomnia'
          },
          {
            type: 'text',
            content: 'Sering Terbangun',
            text: 'Sering Terbangun'
          },
          {
            type: 'text',
            content: 'Sulit Tidur',
            text: 'Sulit Tidur'
          },
        ],
      },
]