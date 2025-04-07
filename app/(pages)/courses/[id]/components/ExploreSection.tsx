"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
interface ExploreSectionProps {
  data: string;
  course: string;// Adjust the type according to the actual data type
}

export const ExploreSection: React.FC<ExploreSectionProps> = ({ data, course }) => {
  const [courses, setCourses] = useState<{ universityData?: { universityImages?: { banner?: string } }; course_titel?: string }[]>([]); // Define the type explicitly
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const res = await fetch(`/api/getCourses?search=${course}&limit=4`);
        const data = await res.json();
        if (Array.isArray(data.courses)) {
          setCourses(data.courses);
        } else {
          console.error("Invalid universities response:", data);
          setCourses([]); // fallback to empty
        }
      } catch (error) {
        console.error("Error fetching universities:", error);
      }
    };

    fetchUniversities();
  }, []);
  console.log("Courses: ba", courses); // Debugging line to check the fetched data

  return (
    <section className="relative flex flex-col lg:flex-row items-center text-white bg-black bg-cover bg-center p-6 md:p-8 lg:px-12 lg:py-12 overflow-hidden justify-between w-full">
      {/* Black Overlay */}
      <div className="absolute inset-0 bg-black opacity-70 z-0"></div>

      {/* Content Section */}
      <div className="relative z-10 w-full lg:w-[52%] flex flex-col justify-center md:space-y-4 sm:px-4 text-left">
        <h6 className="mb-2">Explore More Universities!</h6>
        <p className="text-[#9D9D9D] leading-relaxed">
          Discover the exciting world of universities in the {data}, where you
          can gain a high-quality education and experience life in a new
          culture. Explore the perfect fit for your academic and career
          aspirations!
        </p>
      </div>

      {/* Slider Section */}
      <div className="relative z-10 w-full lg:w-[40%] mt-6 lg:mt-0">
        <div className="relative w-full flex justify-center overflow-hidden">
          <div
            className="flex overflow-x-auto space-x-4 hide-scrollbar"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {courses.slice(0, 4).map((item, index) => (
              <>
                <div
                  key={index}
                  className="relative w-[85%] md:w-[65%]  flex-shrink-0 rounded-3xl shadow-lg overflow-hidden"
                >
                  <Image
                    src={item?.universityData?.universityImages?.banner || "/fallback-image.jpg"}
                    alt="University Banner"
                    width={430}
                    height={350}
                    style={{ objectFit: "cover" }}
                    className="rounded-xl w-full h-full"
                  />
                </div>
                <p className="text-white">{item.course_titel}</p>
              </>

            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
