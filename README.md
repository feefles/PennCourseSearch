# PennCourseSearch

Fed up with the bloated, inefficient, ugly excuse for an online portal that is Penn InTouch, I decided to make a cleaner and simpler way for Quakers to find classes and make schedules. While this is not a full replacement for Penn InTouch, it acts as an improvement of the "Course Search" and "Mock Schedules" features.

Students can search departments, courses, and sections as well as descriptions and instructors. All of the data comes from the [Penn OpenData API](https://esb.isc-seo.upenn.edu/8091/documentation/) and [PennCourseReview API](http://pennlabs.org/docs/pcr.html). The server sorts and returns the requested information as JSON, which is then formatted client-side. Schedules are also created using OpenData information and the image is made using client-side JS.

The server is written using NodeJS and the app is currently hosted on Heroku.

If you have questions, ideas, bug reports, or if you'd like to suggest a new subtitle, let me know.