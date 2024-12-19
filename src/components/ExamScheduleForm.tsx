import React, { useState } from 'react';
import { Upload, ChevronRight, ChevronLeft } from 'lucide-react';
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
const params = CalculationMethod.MoonsightingCommittee();
const date = new Date(2024,12,1);
const coordinates = new Coordinates(35.7897507, -78.6912485);
const prayerTimes = new PrayerTimes(coordinates,date, params);
const { GoogleGenerativeAI } = await import("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyDp-s_QCrViCaucgvWzsk9BZYmW9PwF6A8");
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
const chatSession = model.startChat({
  generationConfig,
});
const prompt = `Extract the following information from this exam schedule image
- Exam subject(s)
- Date of each exam
- Time of each exam
- Duration of each exam

Respond in a strict JSON format:
{
  "exams": [
    {
      "subject": "",
      "date": "",
      "time": "",
      "duration": ""
    }
  ]
}

If an exam doesn't have each of these components don't put it in to array.`
const ExamScheduleForm = () => {
  const [schedule, setSchedule] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [examSchedule, setExamSchedule] = useState<any>(null);
  const [confidenceLevels, setConfidenceLevels] = useState<{[key: string]: string}>({});
  const [dailyActivities, setDailyActivities] = useState({
    isMuslim: false,
    hobbies: '',
    sleep: { bedtime: '', wakeTime: '' },
    exercise: { does: false },
    meals: { breakfast: '', lunch: '', dinner: '' },
    otherCommitments: ''
  })
  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };
  const fetchSchedule = async () => {
    try {
      const generatedSchedule = await generateStudySchedule();
      setSchedule(generatedSchedule as string);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to generate study schedule');
    }
  };
  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) {
        throw new Error("No file selected");
      }


      // Convert file to base64
      const base64Image = await fileToBase64(file);
      
      // Remove the data URL prefix
      const base64Data = base64Image.split(',')[1];
      
      // Send image as part of the message
      const response = await chatSession.sendMessage([
        prompt, 
        { 
          inlineData: { 
            mimeType: file.type, 
            data: base64Data 
          } 
        }
      ]);
      const responseText = response.response.text();
      const cleanedText = responseText
      .replace(/^```json\s*/, '') // Remove opening ```json
      .replace(/```$/, '')       // Remove closing ```
      .trim(); 

      // Now parse the cleaned text as JSON
      const parsedSchedule = JSON.parse(cleanedText);
      // Initialize confidence levels for each exam subject
      const initialConfidenceLevels = parsedSchedule.exams.reduce((acc: { [x: string]: string; }, exam: { subject: string | number; }) => {
        acc[exam.subject] = "medium";
        return acc;
      }, {});
      
      setExamSchedule(parsedSchedule);
      setConfidenceLevels(initialConfidenceLevels);
      setStep(2); // Proceed to the next step (Subject Assessment)
    } catch (err) {
      console.error('Error processing the file:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleConfidenceLevelChange = (subject: string, level: string) => {
    setConfidenceLevels(prev => ({
      ...prev,
      [subject]: level
    }));
  };

  const handleDailyActivitiesChange = (field: string, value: any) => {
    setDailyActivities(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextStep = () => {
    if (step < 4) setStep((prevStep) => prevStep + 1);
  };

  const handlePreviousStep = () => {
    if (step > 1) setStep(step - 1);
  };
  const generateStudySchedule = async () => {
    try {
      
      
      // Construct a detailed prompt for schedule generation
      const schedulePrompt = 
      `Generate a highly personalized study schedule based on the following details Confidence Levels for each course in the same order: ${JSON.stringify(confidenceLevels)} Daily Activities ${JSON.stringify(dailyActivities)} include time for prayer if muslim is true, it is.. ${dailyActivities.isMuslim.toString()} which are ${prayerTimes?.toString()} Study Schedule Guidelines 1. Prioritize subjects with low confidence 2. Respect daily commitments and sleep schedule 3. Include breaks and buffer time 4. Optimize study sessions based on personal activities  5. Provide a structured daily plan leading up to exams 6. use effective study scheduling pratices from research 7. talk briefly about any study method for the respective subject, do this in brackets beside the item in the schedule.  Put it in easy to read text format and return just the schedule for a single day. Without a title or footnotes `
      const schedule = await chatSession.sendMessage([schedulePrompt]);
      const generatedSchedule = schedule.response.text();
      return generatedSchedule;
    }
    catch (err) {
      console.error('Error generating study schedule:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  } 
  const renderFileUpload = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="border-2 border-dashed border-red-100 rounded-xl p-10 text-center bg-gradient-to-b from-red-50/50 to-transparent">
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            id="file-upload"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="h-12 w-12 text-red-400 mb-4" />
            <span className="text-gray-800 font-medium mb-2">
              Upload Your Exam Schedule
            </span>
            <span className="text-sm text-gray-500 max-w-sm">
              Simply drag and drop your schedule image, or click to browse. We'll process it automatically.
            </span>
            <span className="text-xs text-gray-400 mt-4">
              Supported formats: PNG, JPG (max 5MB)
            </span>
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleNextStep}
          className="bg-red-600 text-white px-8 py-3 rounded-xl flex items-center hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
        >
          Next Step
          <ChevronRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderExamSchedule = () => (
    <div className="space-y-6">
      {examSchedule && examSchedule.exams ? (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-medium text-gray-800 mb-4">Exam Schedule and Confidence Assessment</h2>
          <div className="space-y-4">
            {examSchedule.exams.map((exam: { subject: string , date: string , time: string , duration: string }, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-800">{exam.subject}</h3>
                  <p className="text-sm text-gray-600">
                    {exam.date} | {exam.time} | Duration: {exam.duration}
                  </p>
                </div>
                <select 
                  value={confidenceLevels[exam.subject]} 
                  onChange={(e) => handleConfidenceLevelChange(exam.subject, e.target.value)}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="low">Low Confidence</option>
                  <option value="medium">Medium Confidence</option>
                  <option value="high">High Confidence</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 p-4 rounded-xl text-yellow-700">
          No exam schedule detected. Please upload a valid image file.
        </div>
      )}
      <div className="flex justify-between">
        <button
          onClick={handlePreviousStep}
          className="flex items-center text-gray-600 px-6 py-3 rounded-xl hover:bg-white hover:shadow-md transition-all"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous Step
        </button>
        <button
          onClick={handleNextStep}
          className="bg-red-600 text-white px-8 py-3 rounded-xl flex items-center hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
        >
          Next Step
          <ChevronRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
  const renderScheduleGeneration = () => {
    const parseScheduleDetails = (scheduleText: string) => {
      fetchSchedule();
      const sections = scheduleText.split('\n\n');
      return sections.map((section, index) => {
        const lines = section.split('\n');
        const title = lines[0];
        const activities = lines.slice(1).map(line => line.trim());
        
        return (
          <div key={index} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="text-lg font-semibold text-red-700 mb-3">{title}</h3>
            <ul className="space-y-2">
              {activities.map((activity, actIndex) => (
                <li 
                  key={actIndex} 
                  className="flex items-center text-gray-700 text-sm"
                >
                  <span className="mr-2 text-red-500">•</span>
                  {activity}
                </li>
              ))}
            </ul>
          </div>
        );
      });
    };
  
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-medium text-gray-800 mb-4">Personalized Study Schedule</h2>
          
          {schedule ? (
            <div className="space-y-4">
              {parseScheduleDetails(schedule)}
            </div>
          ) : (
            <div className="bg-yellow-100 p-4 rounded-xl text-yellow-700">
              Unable to generate study schedule. Please try again.
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={handlePreviousStep}
            className="flex items-center text-gray-600 px-6 py-3 rounded-xl hover:bg-white hover:shadow-md transition-all"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous Step
          </button>
          <button
            className="bg-red-600 text-white px-8 py-3 rounded-xl flex items-center hover:bg-burgundy-700 shadow-md hover:shadow-lg transition-all"
            onClick={() => {
              alert('Schedule generated! Consider adding export/save functionality.');
            }}
          >
            Save Schedule
          </button>
        </div>
      </div>
    );
  };
  const renderDailyActivities = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Daily Activities & Commitments</h2>
        <div className="space-y-6">
          {/* Religious Obligations */}
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={dailyActivities.isMuslim}
                onChange={(e) => handleDailyActivitiesChange('isMuslim', e.target.checked)

                }
                className="rounded"
              />
              <span>Are you Muslim?</span>
            </label>
          </div>

          {/* Sleep Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bedtime</label>
              <input
                type="time"
                value={dailyActivities.sleep.bedtime}
                onChange={(e) => handleDailyActivitiesChange('sleep', {...dailyActivities.sleep, bedtime: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wake Time</label>
              <input
                type="time"
                value={dailyActivities.sleep.wakeTime}
                onChange={(e) => handleDailyActivitiesChange('sleep', {...dailyActivities.sleep, wakeTime: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Exercise */}
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={dailyActivities.exercise.does}
                onChange={(e) => handleDailyActivitiesChange('exercise', {...dailyActivities.exercise, does: e.target.checked})}
                className="rounded"
              />
              <span>Do you exercise regularly?</span>
            </label>
          </div>

          {/* Hobbies */}
          <div>
            <label className="block text-sm font-medium mb-1">Hobbies/Activities</label>
            <input
              type="text"
              value={dailyActivities.hobbies}
              onChange={(e) => handleDailyActivitiesChange('hobbies', e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g., Playing guitar, reading, etc."
            />
          </div>

          {/* Other Commitments */}
          <div>
            <label className="block text-sm font-medium mb-1">Other Daily Commitments</label>
            <textarea
              value={dailyActivities.otherCommitments}
              onChange={(e) => handleDailyActivitiesChange('otherCommitments', e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Any other regular commitments or activities..."
              rows={3}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between">
        <button
          onClick={handlePreviousStep}
          className="flex items-center text-gray-600 px-6 py-3 rounded-xl hover:bg-white hover:shadow-md transition-all"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous Step
        </button>
        <button
          onClick={handleNextStep}
          className="bg-red-600 text-white px-8 py-3 rounded-xl flex items-center hover:bg-burgundy-700 shadow-md hover:shadow-lg transition-all"
        >
          Generate Schedule
          <ChevronRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif font-medium text-gray-800">Carleton Exam Study Plan</h1>
          <p className="text-gray-600 mt-2 font-light">Optimize your study schedule for peak performance during exam season</p>
        </div>

        {error && (
          <div className="bg-red-100 p-4 rounded-xl text-burgundy-700 mb-6">
            {error}
          </div>
        )}

        {step === 1 && renderFileUpload()}
        {step === 2 && renderExamSchedule()}
        {step === 3 && renderDailyActivities()}
        {step === 4 && renderScheduleGeneration()}
      </div>
    </div>
  );
};

export default ExamScheduleForm;