const TestComponent = () => {
	const apiUrl = import.meta.env.VITE_API_URL;
	console.log("API URL from env:", apiUrl);
	return (
		<div>
			<h2>Test Component</h2>
			<p>API URL: {apiUrl}</p>
		</div>
	);
};

export default TestComponent;
