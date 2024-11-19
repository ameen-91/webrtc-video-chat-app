import React, { useState } from 'react';
import peer from '../service/peer';
import { Button, Form } from 'react-bootstrap';

const FileUpload = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = () => {
    if (file && peer.dataChannel && peer.dataChannel.readyState === "open") {
      peer.sendFile(file);
    }
  };

  return (
    <div className="container mt-5">
      <Form.Group controlId="formFile" className="mb-3">
        <Form.Label>Select a file to upload</Form.Label>
        <Form.Control type="file" onChange={handleFileChange} />
      </Form.Group>
      <Button variant="primary" onClick={handleFileUpload}>
        Upload File
      </Button>
    </div>
  );
};

export default FileUpload;