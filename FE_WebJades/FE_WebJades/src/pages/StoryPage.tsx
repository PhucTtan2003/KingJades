import React from "react";



import { Link } from "react-router-dom";



import Header from "../components/Header";



import Footer from "../components/Footer";



// Ảnh riêng cho khu visual của trang Câu chuyện.



// Muốn đổi ảnh sau này chỉ cần thay file story-hero-visual.png,



// không ảnh hưởng logo/header/staff ở nơi khác.



import storyHeroVisual from "../assets/story/logo.png";



import "../styles/StoryPage.css";







type CoreValue = {



  number: string;



  title: string;



  description: string;



};







const coreValues: CoreValue[] = [



  {



    number: "01",



    title: "Đạo đức",



    description:



      "Đạo đức là một trong những nền tảng quan trọng của kinh doanh. Bên cạnh việc chấp hành pháp luật thì KING JADES luôn duy trì đạo đức nghề nghiệp một cách cao nhất. Dùng đạo đức của mình để cam kết với khách hàng về chất lượng sản phẩm.",



  },



  {



    number: "02",



    title: "Uy tín",



    description:



      "KING JADES đặt giá trị đạo đức lên hàng đầu. Và lấy đó để làm vũ khí cạnh tranh với các thương hiệu khác. Vì vậy, KING JADES bảo vệ chữ TÍN như bảo vệ tính mạng của mình.",



  },



  {



    number: "03",



    title: "Tinh tế",



    description:



      "Mỗi ngày qua đi, KING JADES đều cố gắng hơn để mang đến cho quý khách hàng những sản phẩm tinh tế, chất lượng hơn. Chứa đựng trong từng món trang sức đá quý của KING JADES là những tinh hoa của trời đất. Qua đó, KING JADES mong muốn sẽ xây dựng một xã hội tinh hoa.",



  },



  {



    number: "04",



    title: "Sáng tạo",



    description:



      "KING JADES coi sáng tạo, trí tuệ là đòn bẩy để tạo nên những sản phẩm độc đáo. Mỗi một món trang sức phong thủy bạn mang trên người đều là sự khác biệt. Bởi KING JADES đề cao giá trị của chính bạn và tôn trọng bản sắc riêng của bạn.",



  },



];







const StoryPage: React.FC = () => {



  React.useEffect(() => {



    document.title =



      "Câu Chuyện Thương Hiệu | King Jades";







    window.scrollTo({



      top: 0,



      behavior: "auto",



    });



  }, []);







  return (



    <div className="kj-story-page">



      <Header />







      <main>



        {/* ==================================================



            HERO



        ================================================== */}







        <section className="kj-story-hero">



          <div className="kj-story-hero__glow kj-story-hero__glow--left" />



          <div className="kj-story-hero__glow kj-story-hero__glow--right" />







          <div className="kj-story-container">



            <div className="kj-story-hero__content">



              <span className="kj-story-eyebrow">



                CÂU CHUYỆN THƯƠNG HIỆU



              </span>







              <h1 className="kj-story-hero__title">

                <span className="kj-story-hero__title-main">

                  Tinh hoa ngọc bích

                </span>



                <span className="kj-story-hero__title-sub">

                  đẳng cấp hoàng gia

                </span>

              </h1>







              <div className="kj-story-hero__quote">

                <strong className="kj-story-hero__motto">

                  Tâm ta ở đâu, sự nghiệp ta ở đó

                </strong>



                <blockquote className="kj-story-hero__proverb">

                  <span className="kj-story-hero__proverb-line">

                    “Ngọc bất trác bất thành khí

                  </span>



                  <span className="kj-story-hero__proverb-line">

                    Nhân bất học bất tri lý”

                  </span>

                </blockquote>

              </div>







              <div className="kj-story-hero__actions">



                <Link



  to="/news"



  className="kj-story-button kj-story-button--primary"



>



  Chính sách bảo hành



  <span>→</span>



</Link>







<Link



  to="/news"



  className="kj-story-button kj-story-button--primary"



>



  Chính sách bảo mật



  <span>→</span>



</Link>







                <Link



                  to="/products"



                  className="kj-story-button kj-story-button--light"



                >



                  Xem bộ sưu tập



                </Link>







                <a



                  href="/news"



                  className="kj-story-button kj-story-button--light"



                >



                  Câu chuyện nhân sự



                </a>







              </div>



            </div>







            <div



              className="kj-story-hero__visual"



              aria-hidden="true"



            >



              <div className="kj-story-logo-card">



                <img



                  src={storyHeroVisual}



                  alt="King Jades - Câu chuyện thương hiệu"



                  className="kj-story-logo-card__image kj-story-logo-card__image--story"



                />



              </div>



            </div>



          </div>



        </section>







        {/* ==================================================



            JOURNEY



        ================================================== */}







        <section



          className="kj-story-section kj-story-section--journey"



          id="hanh-trinh"



        >



          <div className="kj-story-container kj-story-container--narrow">



            <header className="kj-story-section-heading">



              <span>



                HÀNH TRÌNH HÌNH THÀNH



              </span>







              <h2>



                Một lời tiên đoán.



                <br />



                Một hành trình không bỏ cuộc.



              </h2>



            </header>







            <div className="kj-story-editorial">



              <p className="kj-story-dropcap">



                Năm 2013, có một vị thầy phong thủy đã xem và nói Thiên Nhân sau này sẽ trở thành Vua Ngọc. Vài năm sau Thiên Nhân đã có cơ duyên được đi học về phong thủy, năng lượng Reki, kinh dịch và quen vài người bạn cũng có niềm yêu thích với Ngọc sau chuyến đi tu Thiền ở Myanmar vào năm 2016.



              </p>







              <p>



                Niềm đam mê dành cho món trang sức mang năng lượng vũ trụ này càng lớn. Anh yêu thích những giá trị mà Ngọc đem lại cho con người. Và yêu thích vẻ đẹp không phô trương nhưng hấp dẫn của nó.



              </p>







              <div className="kj-story-editorial__accent">



                <span>2013</span>







                <strong>



                  Khởi nguồn của một



                  hành trình với Ngọc



                </strong>



              </div>







              <p>



                Vậy là, Công ty được thành lập. Nhưng “vạn sự khởi đầu nan”. Thành công chưa bao giờ đến một cách dễ dàng. Và con đường để trở thành Vua ngọc của Thiên Nhân đòi hỏi thử thách và sự kiên trì. Giai đoạn khó khăn nhất có lẽ là khi Công ty bị phá sản, anh không còn tiền, không còn chỗ để ở. Mọi chuyện tưởng chừng như đã chấm hết, sẽ không có một Vua Ngọc như lời phán của vị thầy đã nói với anh.



              </p>







              <div className="kj-story-testimonial">



  <span>



    MỘT LỜI CHIA SẺ ĐÃ THAY ĐỔI TẤT CẢ



  </span>







  <blockquote>



    “Từ khi anh đeo sản phẩm của bên em, gia đình anh hòa thuận hơn,



    công việc suôn sẻ, thăng tiến. Từ trưởng phòng, anh trở thành



    giám đốc của bưu cục Viettel”.



  </blockquote>



</div>







              <p>



                Như một chiếc phao cứu sinh trong cơn đuối nước, Thiên Nhân đã lấy lại động lực tiếp tục theo đuổi đam mê của mình. Tại địa chỉ 63 Hoa Sứ, quận Phú Nhuận, TPHCM, Ngọc Phỉ Thuý Myanmar ra đời chỉ với số vốn là 10USD. Với anh, mỗi sản phẩm được bán ra không chỉ là một món trang sức thông thường. Mà đó là một lời cầu chúc trọn vẹn nhất dành cho khách hàng.



              </p>







              <p>



                Vì vậy, anh luôn tỉ mỉ, tận tâm trong từng sản phẩm. Mỗi sản phẩm trước khi đến tay khách hàng là quá trình tư vấn, đo, xem phong thủy, kiểm tra độ tương thích năng lượng. Trải qua thời gian dài kiên trì, nỗ lực không ngừng nghỉ, sản phẩm đã được khách hàng đón nhận.



              </p>



            </div>



          </div>



        </section>







        {/* ==================================================



            BRAND BIRTH



        ================================================== */}







        <section className="kj-story-section kj-story-brand-birth">



          <div className="kj-story-container">



            <div className="kj-story-brand-birth__card">



              <div>



                <span className="kj-story-eyebrow">



                  KING JADES



                </span>







                <h2>



                  Từ Ngọc Phỉ Thuý Myanmar



                  đến thương hiệu King Jades



                </h2>



              </div>







              <div className="kj-story-brand-birth__copy">



                <p>



                  Và cái tên <strong>KING JADES</strong> được hình thành. Giờ đây, KING JADES đã trở thành thương hiệu trang sức ngọc phong thuỷ nổi tiếng ở Việt Nam và nước ngoài.



                </p>







                <p>



                  Mỗi sản phẩm của KING JADES đều mong muốn đem đến cho quý khách thật nhiều sức khỏe và thịnh vượng. Lan tỏa thật nhiều vận khí hấp thụ được từ tinh hoa Nhật Nguyệt Tinh Thần cho gia chủ.



                </p>



              </div>



            </div>



          </div>



        </section>







        {/* ==================================================



            MISSION



        ================================================== */}







        <section className="kj-story-section">



          <div className="kj-story-container">



            <header className="kj-story-section-heading kj-story-section-heading--center">



              <span>



                SỨ MỆNH



              </span>







              <h2>



                Giá trị của King Jades



                không dừng lại ở một món trang sức



              </h2>



            </header>







            <div className="kj-story-mission-grid">



              <article>



                <span>01</span>







                <h3>



                  Chất Lượng Tinh Tế



                </h3>







                <p>



                  KING JADES cam kết cung cấp các sản phẩm trang sức từ ngọc với chất lượng tốt nhất. Mỗi sản phẩm đều được chế tác cẩn thận, kiểm định kỹ lưỡng để đảm bảo độ tinh xảo từ những phiến đá tự nhiên “độc nhất vô nhị.”



                </p>



              </article>







              <article>



                <span>02</span>







                <h3>



                  Giá Trị Tinh Thần



                </h3>







                <p>



                  Sản phẩm của KING JADES không chỉ là trang sức mà còn là những tác phẩm nghệ thuật mang đậm giá trị tình thần về mặt tâm linh. Thương hiệu mong muốn truyền tải những thông điệp tích cực và năng lượng may mắn, thay đổi vận khí của người đeo thông qua từng món trang sức.



                </p>



              </article>







              <article>



                <span>03</span>







                <h3>



                  Nâng Tầm Dịch Vụ



                </h3>







                <p>



                  KING JADES luôn đặt khách hàng lên hàng đầu, với dịch vụ tư vấn và chăm sóc tận tình. Mục tiêu là mang lại trải nghiệm mua sắm hài lòng và đáp ứng mọi nhu cầu của khách hàng.



                </p>



              </article>



            </div>



          </div>



        </section>







        {/* ==================================================



            VISION



        ================================================== */}







        <section className="kj-story-section kj-story-vision">



          <div className="kj-story-container">



            <div className="kj-story-vision__number">



              <span>



                2035



              </span>



            </div>







            <div className="kj-story-vision__content">



              <span className="kj-story-eyebrow">



                TẦM NHÌN



              </span>







              <h2>



                Hướng tới thương hiệu



                trang sức đá quý phong thủy



                trị giá 100 triệu USD



              </h2>







              <p>



                KING JADES vẫn không ngừng nỗ lực mỗi ngày để đem đến những sản phẩm chất lượng hơn, mẫu mã đẹp hơn đến cho quý khách hàng. Mục tiêu của chúng tôi là sẽ trở thành thương hiệu trang sức đá quý phong thủy trị giá 100 triệu USD vào năm 2035.



              </p>



            </div>



          </div>



        </section>







        {/* ==================================================



            CORE VALUES



        ================================================== */}







        <section className="kj-story-section">



          <div className="kj-story-container">



            <header className="kj-story-section-heading">



              <span>



                GIÁ TRỊ CỐT LÕI



              </span>







              <h2>



                Bốn giá trị tạo nên



                bản sắc King Jades



              </h2>



            </header>







            <div className="kj-story-values">



              {coreValues.map(



                (value) => (



                  <article



                    key={



                      value.number



                    }



                  >



                    <span>



                      {



                        value.number



                      }



                    </span>







                    <h3>



                      {



                        value.title



                      }



                    </h3>







                    <p>



                      {



                        value.description



                      }



                    </p>



                  </article>



                )



              )}



            </div>



          </div>



        </section>







        {/* ==================================================



            FUTURE



        ================================================== */}







        <section className="kj-story-section kj-story-future">



          <div className="kj-story-container">



            <div className="kj-story-future__panel">



              <span className="kj-story-eyebrow">



                TẦM NHÌN TƯƠNG LAI



              </span>







              <h2>



                Một thương hiệu ngọc



                Việt Nam vươn tầm quốc tế



              </h2>







              <p>



                KING JADES không ngừng nỗ lực để trở thành một trong những thương hiệu trang sức ngọc hàng đầu Việt Nam và Quốc tế. Thương hiệu hy vọng mang lại sự bình an và năng lượng tích cực cho khách hàng thông qua từng sản phẩm trang sức ngọc quý.



              </p>







              <p>



                Với sứ mệnh và tầm nhìn rõ ràng, KING JADES không chỉ tập trung vào việc bán hàng mà còn mong muốn tạo ra những giá trị lâu dài cho khách hàng và cộng đồng!



              </p>







              <div className="kj-story-future__actions">



                <Link



                  to="/products"



                  className="kj-story-button kj-story-button--gold"



                >



                  Khám phá bộ sưu tập



                  <span>→</span>



                </Link>







                <Link



                  to="/contact"



                  className="kj-story-button kj-story-button--outline-light"



                >



                  Liên hệ King Jades



                </Link>



              </div>



            </div>



          </div>



        </section>



      </main>







      <Footer />



    </div>



  );



};







export default StoryPage;
