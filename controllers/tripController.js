const getAllTrips = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Not implemented yet"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const getTripById = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Not implemented yet"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const createTrip = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Not implemented yet"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const dispatchTrip = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Not implemented yet"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const completeTrip = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Not implemented yet"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const cancelTrip = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: "Not implemented yet"
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

export default {
    getAllTrips,
    getTripById,
    createTrip,
    dispatchTrip,
    completeTrip,
    cancelTrip
};

export {
    getAllTrips,
    getTripById,
    createTrip,
    dispatchTrip,
    completeTrip,
    cancelTrip
};